import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateExecuteRateLimit, InMemoryRateLimitStore, type ExecuteRateLimitConfig } from './rateLimit.js'

const baseConfig: ExecuteRateLimitConfig = {
  enabled: true,
  keyPrefix: 'execute',
  userBurstMax: 2,
  userBurstWindowSec: 10,
  userSustainedMax: 4,
  userSustainedWindowSec: 30,
  courseMax: 3,
  courseWindowSec: 10,
}

test('allows requests under user burst limit', () => {
  const store = new InMemoryRateLimitStore()
  const decisionOne = evaluateExecuteRateLimit({
    store,
    config: baseConfig,
    identity: { userId: 'u-1', courseId: 'c-1' },
    nowMs: 1_000,
  })
  const decisionTwo = evaluateExecuteRateLimit({
    store,
    config: baseConfig,
    identity: { userId: 'u-1', courseId: 'c-1' },
    nowMs: 1_500,
  })

  assert.deepEqual(decisionOne, { allowed: true })
  assert.deepEqual(decisionTwo, { allowed: true })
})

test('blocks when user burst limit is exceeded', () => {
  const store = new InMemoryRateLimitStore()
  evaluateExecuteRateLimit({ store, config: baseConfig, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 1_000 })
  evaluateExecuteRateLimit({ store, config: baseConfig, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 1_500 })
  const blocked = evaluateExecuteRateLimit({
    store,
    config: baseConfig,
    identity: { userId: 'u-1', courseId: 'c-1' },
    nowMs: 2_000,
  })

  assert.equal(blocked.allowed, false)
  assert.equal(blocked.scope, 'user_burst')
  assert.equal(blocked.retryAfterSeconds, 8)
  assert.equal(blocked.limit, 2)
  assert.equal(blocked.windowSeconds, 10)
})

test('allows again after user burst window resets', () => {
  const store = new InMemoryRateLimitStore()
  evaluateExecuteRateLimit({ store, config: baseConfig, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 1_000 })
  evaluateExecuteRateLimit({ store, config: baseConfig, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 2_000 })
  const afterReset = evaluateExecuteRateLimit({
    store,
    config: baseConfig,
    identity: { userId: 'u-1', courseId: 'c-1' },
    nowMs: 10_100,
  })

  assert.deepEqual(afterReset, { allowed: true })
})

test('blocks when user sustained limit is exceeded', () => {
  const store = new InMemoryRateLimitStore()
  const sustainedOnly = { ...baseConfig, userBurstMax: 10, courseMax: 10 }
  evaluateExecuteRateLimit({ store, config: sustainedOnly, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 100 })
  evaluateExecuteRateLimit({ store, config: sustainedOnly, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 200 })
  evaluateExecuteRateLimit({ store, config: sustainedOnly, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 300 })
  evaluateExecuteRateLimit({ store, config: sustainedOnly, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 400 })
  const blocked = evaluateExecuteRateLimit({
    store,
    config: sustainedOnly,
    identity: { userId: 'u-1', courseId: 'c-1' },
    nowMs: 500,
  })

  assert.equal(blocked.allowed, false)
  assert.equal(blocked.scope, 'user_sustained')
  assert.equal(blocked.limit, 4)
  assert.equal(blocked.windowSeconds, 30)
})

test('allows under course limit then blocks when exceeded', () => {
  const store = new InMemoryRateLimitStore()
  const config = { ...baseConfig, userBurstMax: 10, userSustainedMax: 10 }
  evaluateExecuteRateLimit({ store, config, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 1_000 })
  evaluateExecuteRateLimit({ store, config, identity: { userId: 'u-2', courseId: 'c-1' }, nowMs: 1_100 })
  evaluateExecuteRateLimit({ store, config, identity: { userId: 'u-3', courseId: 'c-1' }, nowMs: 1_200 })
  const blocked = evaluateExecuteRateLimit({
    store,
    config,
    identity: { userId: 'u-4', courseId: 'c-1' },
    nowMs: 1_300,
  })

  assert.equal(blocked.allowed, false)
  assert.equal(blocked.scope, 'course')
  assert.equal(blocked.limit, 3)
  assert.equal(blocked.windowSeconds, 10)
})

test('two users in same course isolate user limits while sharing course limit', () => {
  const store = new InMemoryRateLimitStore()
  const config = { ...baseConfig, userBurstMax: 1, userSustainedMax: 10, courseMax: 10 }
  evaluateExecuteRateLimit({ store, config, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 1_000 })
  const secondUser = evaluateExecuteRateLimit({
    store,
    config,
    identity: { userId: 'u-2', courseId: 'c-1' },
    nowMs: 1_100,
  })
  const firstUserBlocked = evaluateExecuteRateLimit({
    store,
    config,
    identity: { userId: 'u-1', courseId: 'c-1' },
    nowMs: 1_200,
  })

  assert.deepEqual(secondUser, { allowed: true })
  assert.equal(firstUserBlocked.allowed, false)
  assert.equal(firstUserBlocked.scope, 'user_burst')
})

test('missing course applies user-only policies', () => {
  const store = new InMemoryRateLimitStore()
  const config = { ...baseConfig, userBurstMax: 1, courseMax: 1 }
  evaluateExecuteRateLimit({ store, config, identity: { userId: 'u-1', courseId: null }, nowMs: 1_000 })
  const blocked = evaluateExecuteRateLimit({
    store,
    config,
    identity: { userId: 'u-1', courseId: null },
    nowMs: 1_100,
  })

  assert.equal(blocked.allowed, false)
  assert.equal(blocked.scope, 'user_burst')
})

test('disabled limiter bypasses all policies', () => {
  const store = new InMemoryRateLimitStore()
  const disabled = { ...baseConfig, enabled: false, userBurstMax: 1, courseMax: 1 }
  evaluateExecuteRateLimit({ store, config: disabled, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 1_000 })
  const allowed = evaluateExecuteRateLimit({ store, config: disabled, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 1_100 })

  assert.deepEqual(allowed, { allowed: true })
})

test('blocked request does not consume other scope quota', () => {
  const store = new InMemoryRateLimitStore()
  const config = { ...baseConfig, userBurstMax: 1, userSustainedMax: 10, courseMax: 2 }
  evaluateExecuteRateLimit({ store, config, identity: { userId: 'u-1', courseId: 'c-1' }, nowMs: 1_000 })
  const blocked = evaluateExecuteRateLimit({
    store,
    config,
    identity: { userId: 'u-1', courseId: 'c-1' },
    nowMs: 1_100,
  })
  const secondUser = evaluateExecuteRateLimit({
    store,
    config,
    identity: { userId: 'u-2', courseId: 'c-1' },
    nowMs: 1_200,
  })

  assert.equal(blocked.allowed, false)
  assert.equal(blocked.scope, 'user_burst')
  assert.deepEqual(secondUser, { allowed: true })
})
