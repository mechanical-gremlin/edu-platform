import test from 'node:test'
import assert from 'node:assert/strict'
import { getExecuteErrorMessage } from '../src/components/coding/executeErrors.ts'

test('getExecuteErrorMessage uses code-based messages for known retryable errors', () => {
  assert.equal(
    getExecuteErrorMessage({ code: 'EXEC_TIMEOUT', retryable: true, message: 'backend timeout' }, 504),
    'Execution timed out before the result was ready. Please try again.',
  )
  assert.equal(
    getExecuteErrorMessage({ code: 'EXEC_UPSTREAM_ERROR', retryable: true }, 502),
    'Execution service temporarily unavailable. Please try again.',
  )
  assert.equal(
    getExecuteErrorMessage({ code: 'EXECUTE_RATE_LIMITED', retryable: false }, 429),
    'Execution rate limit exceeded. Please retry later.',
  )
})

test('getExecuteErrorMessage preserves unknown backend messages without duplicating retry guidance', () => {
  assert.equal(
    getExecuteErrorMessage({ code: 'EXEC_CUSTOM', message: 'Temporary issue. Please try again.', retryable: true }, 500),
    'Temporary issue. Please try again.',
  )
  assert.equal(
    getExecuteErrorMessage({ code: 'EXEC_CUSTOM', message: 'Temporary issue.', retryable: true }, 500),
    'Temporary issue. Please try again.',
  )
})

test('getExecuteErrorMessage falls back to HTTP status when no message is available', () => {
  assert.equal(getExecuteErrorMessage({}, 502), 'HTTP 502')
  assert.equal(getExecuteErrorMessage({ code: 'EXEC_CUSTOM', retryable: true }, 503), 'HTTP 503. Please try again.')
})
