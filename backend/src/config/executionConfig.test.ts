import test from 'node:test'
import assert from 'node:assert/strict'
import { assertExecutionConfigAtStartup, resolveExecutionConfig } from './executionConfig.js'

const validEnv = {
  NODE_ENV: 'test',
  JUDGE0_BASE_URL: 'https://judge0.school.internal/',
  JUDGE0_API_KEY: '',
  EXEC_TIMEOUT_MS: '12000',
  EXEC_MAX_SOURCE_KB: '64',
  EXEC_MAX_STDIN_KB: '8',
  EXEC_MAX_OUTPUT_KB: '32',
  EXEC_RATE_LIMIT_ENABLED: 'true',
  EXEC_RATE_LIMIT_KEY_PREFIX: 'execute',
  EXEC_RATE_LIMIT_USER_BURST_MAX: '8',
  EXEC_RATE_LIMIT_USER_BURST_WINDOW_SEC: '60',
  EXEC_RATE_LIMIT_USER_SUSTAINED_MAX: '60',
  EXEC_RATE_LIMIT_USER_SUSTAINED_WINDOW_SEC: '900',
  EXEC_RATE_LIMIT_COURSE_MAX: '300',
  EXEC_RATE_LIMIT_COURSE_WINDOW_SEC: '300',
}

test('resolveExecutionConfig parses valid values', () => {
  const state = resolveExecutionConfig(validEnv)
  assert.equal(state.errors.length, 0)
  assert.deepEqual(state.config, {
    judge0BaseUrl: 'https://judge0.school.internal',
    judge0ApiKey: '',
    timeoutMs: 12000,
    maxSourceKb: 64,
    maxStdinKb: 8,
    maxOutputKb: 32,
    rateLimitEnabled: true,
    rateLimitKeyPrefix: 'execute',
    rateLimitUserBurstMax: 8,
    rateLimitUserBurstWindowSec: 60,
    rateLimitUserSustainedMax: 60,
    rateLimitUserSustainedWindowSec: 900,
    rateLimitCourseMax: 300,
    rateLimitCourseWindowSec: 300,
  })
})

test('resolveExecutionConfig reports numeric bound violations', () => {
  const state = resolveExecutionConfig({
    ...validEnv,
    EXEC_TIMEOUT_MS: '500',
    EXEC_MAX_SOURCE_KB: '0',
  })

  assert.equal(state.config, null)
  assert.ok(state.errors.includes('EXEC_TIMEOUT_MS must be at least 1000'))
  assert.ok(state.errors.includes('EXEC_MAX_SOURCE_KB must be at least 1'))
})

test('resolveExecutionConfig parses rate limit defaults when vars are omitted', () => {
  const state = resolveExecutionConfig({
    ...validEnv,
    EXEC_RATE_LIMIT_ENABLED: undefined,
    EXEC_RATE_LIMIT_KEY_PREFIX: undefined,
    EXEC_RATE_LIMIT_USER_BURST_MAX: undefined,
    EXEC_RATE_LIMIT_USER_BURST_WINDOW_SEC: undefined,
    EXEC_RATE_LIMIT_USER_SUSTAINED_MAX: undefined,
    EXEC_RATE_LIMIT_USER_SUSTAINED_WINDOW_SEC: undefined,
    EXEC_RATE_LIMIT_COURSE_MAX: undefined,
    EXEC_RATE_LIMIT_COURSE_WINDOW_SEC: undefined,
  })

  assert.equal(state.errors.length, 0)
  assert.equal(state.config?.rateLimitEnabled, true)
  assert.equal(state.config?.rateLimitKeyPrefix, 'execute')
  assert.equal(state.config?.rateLimitUserBurstMax, 8)
  assert.equal(state.config?.rateLimitUserBurstWindowSec, 60)
  assert.equal(state.config?.rateLimitUserSustainedMax, 60)
  assert.equal(state.config?.rateLimitUserSustainedWindowSec, 900)
  assert.equal(state.config?.rateLimitCourseMax, 300)
  assert.equal(state.config?.rateLimitCourseWindowSec, 300)
})

test('resolveExecutionConfig requires API key only in production', () => {
  const state = resolveExecutionConfig({
    ...validEnv,
    NODE_ENV: 'production',
    JUDGE0_API_KEY: '',
  })

  assert.equal(state.config, null)
  assert.ok(state.errors.includes('JUDGE0_API_KEY is required when NODE_ENV=production'))
})

test('assertExecutionConfigAtStartup throws clear startup error in production', () => {
  const state = resolveExecutionConfig({
    ...validEnv,
    NODE_ENV: 'production',
    JUDGE0_BASE_URL: 'not-a-url',
    JUDGE0_API_KEY: '',
  })

  assert.throws(
    () => assertExecutionConfigAtStartup(state, { NODE_ENV: 'production' }),
    /Invalid execution configuration:[\s\S]*JUDGE0_BASE_URL must be a valid URL[\s\S]*JUDGE0_API_KEY is required when NODE_ENV=production/,
  )
})
