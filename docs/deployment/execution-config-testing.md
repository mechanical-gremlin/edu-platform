# Execution config hardening test steps

Use this checklist after deploying backend changes related to `/execute`.

## 1) Production fail-fast validation

1. Set `NODE_ENV=production`.
2. Remove one required execution variable (for example `JUDGE0_BASE_URL`).
3. Start the backend.
4. Confirm startup exits with an `Invalid execution configuration` error listing the missing/invalid variable.

## 2) Health endpoint execution state

1. Start backend with valid execution vars.
2. Run:
   ```bash
   curl http://localhost:3001/health
   ```
3. Confirm response includes:
   - `status: "ok"`
   - `execution.configured: true`
   - `execution.upstream` signal (`reachable` or `unreachable`)
   - `execution.errors: []`

## 3) `/execute` happy path

1. Send an authenticated execute request:
   ```bash
   curl -X POST http://localhost:3001/execute \
     -H 'Content-Type: application/json' \
     -H 'x-user-id: s-1' \
     -d '{"language":"javascript","code":"console.log(\"Hello\")"}'
   ```
2. Confirm a `200` response with Judge0 result fields (`stdout`, `stderr`, `compile_output`, `status`).

## 4) Input size enforcement

1. Send source code bigger than `EXEC_MAX_SOURCE_KB`.
2. Confirm backend returns `413` with:
   - `code: "EXEC_PAYLOAD_TOO_LARGE"`
   - `retryable: false`
   - `requestId`
   - `message: "Source code exceeds EXEC_MAX_SOURCE_KB (...)"`.
3. Repeat with oversized `stdin` (`EXEC_MAX_STDIN_KB`) and confirm the same `413` schema and limit-specific message.

## 5) Output size enforcement

1. Execute code that returns output larger than `EXEC_MAX_OUTPUT_KB`.
2. Confirm response `stdout`/`stderr`/`compile_output` are truncated as needed and end with `[output truncated]`.
3. Confirm `truncation.<field>` metadata is present with:
   - `truncated`
   - `originalSizeBytes`
   - `maxSizeBytes`
4. Confirm truncation does not break UTF-8 characters at boundaries.

## 6) Timeout mapping

1. Lower `EXEC_TIMEOUT_MS` to a small test-safe value.
2. Execute code or point the backend at a deliberately slow/unresponsive Judge0 instance.
3. Confirm backend returns `504` with:
   - `code: "EXEC_TIMEOUT"`
   - `retryable: true`
   - `requestId`

## 7) Transient failure retry

1. Point the backend at a Judge0 deployment or proxy that fails once with a transient `5xx`, then succeeds.
2. Send an authenticated `/execute` request.
3. Confirm the request eventually succeeds without a client-side retry, showing the backend retried upstream once.

## 8) Non-retryable upstream 4xx

1. Trigger a Judge0-side validation/auth failure that returns `4xx`.
2. Confirm backend returns `400` immediately with:
   - `code: "EXEC_BAD_REQUEST"`
   - `retryable: false`
   - `requestId`

## 9) Frontend error messaging

1. In the coding editor, trigger an `EXEC_TIMEOUT` response and confirm the UI shows a timeout-specific message plus retry guidance.
2. Trigger an `EXEC_UPSTREAM_ERROR` response and confirm the UI shows a temporary-unavailable message plus retry guidance.
3. Trigger a non-retryable `EXEC_BAD_REQUEST` response and confirm the UI surfaces the backend message without retry guidance.
4. With source/stdin over configured frontend limits, confirm a preflight warning appears and Run stays disabled.
5. Trigger output truncation and confirm the output panel shows a truncation notice.
