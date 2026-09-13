import { createHash } from 'node:crypto'

export type ExecuteRateLimitScope = 'user_burst' | 'user_sustained' | 'course'

export interface RateLimitStoreIncrementResult {
  count: number
  resetAtMs: number
}

export interface RateLimitStore {
  incrementFixedWindow(key: string, windowSeconds: number, nowMs: number): RateLimitStoreIncrementResult
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

  incrementFixedWindow(key: string, windowSeconds: number, nowMs: number): RateLimitStoreIncrementResult {
    const windowMs = windowSeconds * 1000
    const windowStart = Math.floor(nowMs / windowMs) * windowMs
    const resetAtMs = windowStart + windowMs
    const windowKey = `${key}:${windowStart}`
    const current = this.counters.get(windowKey)
    const nextCount = (current?.count ?? 0) + 1
    this.counters.set(windowKey, { count: nextCount, resetAtMs })
    return { count: nextCount, resetAtMs }
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

  for (const policy of policies) {
    const { count, resetAtMs } = store.incrementFixedWindow(policy.key, policy.windowSeconds, nowMs)
    if (count > policy.limit) {
      return {
        allowed: false,
        scope: policy.scope,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000)),
        limit: policy.limit,
        windowSeconds: policy.windowSeconds,
        remaining: 0,
      }
    }
  }

  return { allowed: true }
}
