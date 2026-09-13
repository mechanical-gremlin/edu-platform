import { createHash } from 'node:crypto'

export type ExecuteRateLimitScope = 'user_burst' | 'user_sustained' | 'course'

export interface RateLimitStoreIncrementResult {
  count: number
  resetAtMs: number
}

export interface RateLimitStore {
  checkAndIncrementFixedWindow(key: string, windowSeconds: number, limit: number, nowMs: number): {
    allowed: boolean
    count: number
    resetAtMs: number
  }
  decrementFixedWindow(key: string, windowSeconds: number, nowMs: number): void
}

export interface ExecuteRateLimitConfig {
  enabled: boolean
  keyPrefix: string
  userBurstMax: number
  userBurstWindowSec: number
  userSustainedMax: number
  userSustainedWindowSec: number
  courseMax: number
  courseWindowSec: number
}

export interface ExecuteRateLimitIdentity {
  userId: string | null
  courseId: string | null
}

export interface ExecuteRateLimitBlocked {
  allowed: false
  scope: ExecuteRateLimitScope
  retryAfterSeconds: number
  limit: number
  windowSeconds: number
  remaining: 0
}

export interface ExecuteRateLimitAllowed {
  allowed: true
}

export type ExecuteRateLimitDecision = ExecuteRateLimitAllowed | ExecuteRateLimitBlocked

interface RateLimitPolicy {
  scope: ExecuteRateLimitScope
  key: string
  limit: number
  windowSeconds: number
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, { count: number; resetAtMs: number }>()
  private nextCleanupAtMs = 0

  private pruneExpired(nowMs: number) {
    if (nowMs < this.nextCleanupAtMs) {
      return
    }

    for (const [key, value] of this.counters) {
      if (value.resetAtMs <= nowMs) {
        this.counters.delete(key)
      }
    }

    this.nextCleanupAtMs = nowMs + 60_000
  }

  private resolveWindow(key: string, windowSeconds: number, nowMs: number) {
    const windowMs = windowSeconds * 1000
    const windowStart = Math.floor(nowMs / windowMs) * windowMs
    const resetAtMs = windowStart + windowMs
    const windowKey = `${key}:${windowStart}`
    return { windowKey, resetAtMs }
  }

  checkAndIncrementFixedWindow(key: string, windowSeconds: number, limit: number, nowMs: number) {
    this.pruneExpired(nowMs)
    const { windowKey, resetAtMs } = this.resolveWindow(key, windowSeconds, nowMs)
    const current = this.counters.get(windowKey)
    const currentCount = current?.count ?? 0
    const nextCount = currentCount + 1
    if (nextCount > limit) {
      return {
        allowed: false,
        count: currentCount,
        resetAtMs: current?.resetAtMs ?? resetAtMs,
      }
    }

    this.counters.set(windowKey, { count: nextCount, resetAtMs })
    return { allowed: true, count: nextCount, resetAtMs }
  }

  decrementFixedWindow(key: string, windowSeconds: number, nowMs: number) {
    this.pruneExpired(nowMs)
    const { windowKey } = this.resolveWindow(key, windowSeconds, nowMs)
    const current = this.counters.get(windowKey)
    if (!current) {
      return
    }
    if (current.count <= 1) {
      this.counters.delete(windowKey)
      return
    }
    this.counters.set(windowKey, {
      count: current.count - 1,
      resetAtMs: current.resetAtMs,
    })
  }

  reset() {
    this.counters.clear()
  }
}

export const hashIdentity = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 12)

export const evaluateExecuteRateLimit = ({
  store,
  config,
  identity,
  nowMs = Date.now(),
}: {
  store: RateLimitStore
  config: ExecuteRateLimitConfig
  identity: ExecuteRateLimitIdentity
  nowMs?: number
}): ExecuteRateLimitDecision => {
  if (!config.enabled || !identity.userId) {
    return { allowed: true }
  }

  const policyPrefix = config.keyPrefix || 'execute'
  const policies: RateLimitPolicy[] = [
    {
      scope: 'user_burst',
      key: `${policyPrefix}:user:${identity.userId}:burst`,
      limit: config.userBurstMax,
      windowSeconds: config.userBurstWindowSec,
    },
    {
      scope: 'user_sustained',
      key: `${policyPrefix}:user:${identity.userId}:sustained`,
      limit: config.userSustainedMax,
      windowSeconds: config.userSustainedWindowSec,
    },
  ]

  if (identity.courseId) {
    policies.push({
      scope: 'course',
      key: `${policyPrefix}:course:${identity.courseId}`,
      limit: config.courseMax,
      windowSeconds: config.courseWindowSec,
    })
  }

  const appliedPolicies: RateLimitPolicy[] = []

  for (const policy of policies) {
    const result = store.checkAndIncrementFixedWindow(policy.key, policy.windowSeconds, policy.limit, nowMs)
    if (!result.allowed) {
      for (const appliedPolicy of appliedPolicies) {
        store.decrementFixedWindow(appliedPolicy.key, appliedPolicy.windowSeconds, nowMs)
      }
      return {
        allowed: false,
        scope: policy.scope,
        retryAfterSeconds: Math.max(1, Math.ceil((result.resetAtMs - nowMs) / 1000)),
        limit: policy.limit,
        windowSeconds: policy.windowSeconds,
        remaining: 0,
      }
    }
    appliedPolicies.push(policy)
  }

  return { allowed: true }
}
