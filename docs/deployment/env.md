# Backend execution environment variables

The API validates execution configuration at startup from a single contract.

## Required variables

| Variable | Required | Description |
|---|---|---|
| `JUDGE0_BASE_URL` | Yes | Base URL for your Judge0-compatible execution provider. Must be a valid URL. |
| `JUDGE0_API_KEY` | Required in production | API key/token used by the execution provider. |
| `EXEC_TIMEOUT_MS` | Yes | Request timeout for Judge0 submission/polling. Integer, `1000..60000`. |
| `EXEC_MAX_SOURCE_KB` | Yes | Maximum source payload size in KB. Integer, `1..1024`. |
| `EXEC_MAX_STDIN_KB` | Yes | Maximum stdin payload size in KB. Integer, `1..1024`. |
| `EXEC_MAX_OUTPUT_KB` | Yes | Maximum output size returned per output field in KB. Integer, `1..1024`. |

## Startup behavior

- In `NODE_ENV=production`, the backend fails fast on boot when any required execution variable is missing or invalid.
- In non-production environments, the app can boot for local development, and `/execute` returns a clear `503` configuration error until values are fixed.

## `/execute` error contract

- Timeouts return `504` with `{ code: "EXEC_TIMEOUT", message, retryable, requestId }`.
- Transient Judge0/network failures return `502` with `{ code: "EXEC_UPSTREAM_ERROR", message, retryable, requestId }`.
- Client validation and upstream 4xx execution rejections return `400` with `{ code: "EXEC_BAD_REQUEST", message, retryable, requestId }`.

## Provider-agnostic examples

RapidAPI-hosted Judge0:

```dotenv
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=<your-rapidapi-key>
EXEC_TIMEOUT_MS=12000
EXEC_MAX_SOURCE_KB=64
EXEC_MAX_STDIN_KB=8
EXEC_MAX_OUTPUT_KB=32
```

Self-hosted Judge0:

```dotenv
JUDGE0_BASE_URL=https://judge0.your-domain.tld
JUDGE0_API_KEY=<your-service-token>
EXEC_TIMEOUT_MS=12000
EXEC_MAX_SOURCE_KB=64
EXEC_MAX_STDIN_KB=8
EXEC_MAX_OUTPUT_KB=32
```
