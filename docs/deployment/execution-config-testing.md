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
2. Confirm backend returns `400` with:
   - `Source code exceeds EXEC_MAX_SOURCE_KB (...)`.

## 5) Output size enforcement

1. Execute code that returns output larger than `EXEC_MAX_OUTPUT_KB`.
2. Confirm response output is truncated and ends with `[output truncated]`.
