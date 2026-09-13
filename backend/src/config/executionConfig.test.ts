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
