import test from 'node:test'
import assert from 'node:assert/strict'
import { isRetryableJudge0Failure } from './judge0.js'

test('isRetryableJudge0Failure retries network, timeout, and 5xx failures only', () => {
  assert.equal(isRetryableJudge0Failure({ isNetworkError: true }), true)
  assert.equal(isRetryableJudge0Failure({ isTimeout: true }), true)
  assert.equal(isRetryableJudge0Failure({ statusCode: 500 }), true)
  assert.equal(isRetryableJudge0Failure({ statusCode: 503 }), true)
  assert.equal(isRetryableJudge0Failure({ statusCode: 400 }), false)
  assert.equal(isRetryableJudge0Failure({ statusCode: 401 }), false)
  assert.equal(isRetryableJudge0Failure({ statusCode: 422 }), false)
})
