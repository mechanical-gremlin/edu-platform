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
| `EXEC_RATE_LIMIT_ENABLED` | Optional (default `true`) | Enables `/execute` fair-use rate limiting checks. |
| `EXEC_RATE_LIMIT_KEY_PREFIX` | Optional (default `execute`) | Namespace prefix for rate-limit keys/counters. |
| `EXEC_RATE_LIMIT_USER_BURST_MAX` | Optional (default `8`) | Per-user burst control max requests in burst window. |
| `EXEC_RATE_LIMIT_USER_BURST_WINDOW_SEC` | Optional (default `60`) | Per-user burst fixed-window size in seconds. |
| `EXEC_RATE_LIMIT_USER_SUSTAINED_MAX` | Optional (default `60`) | Per-user sustained control max requests in sustained window. |
| `EXEC_RATE_LIMIT_USER_SUSTAINED_WINDOW_SEC` | Optional (default `900`) | Per-user sustained fixed-window size in seconds. |
| `EXEC_RATE_LIMIT_COURSE_MAX` | Optional (default `300`) | Shared per-course guardrail max requests in course window. |
| `EXEC_RATE_LIMIT_COURSE_WINDOW_SEC` | Optional (default `300`) | Per-course fixed-window size in seconds. |

## Startup behavior

- In `NODE_ENV=production`, the backend fails fast on boot when any required execution variable is missing or invalid.
- In non-production environments, the app can boot for local development, and `/execute` returns a clear `503` configuration error until values are fixed.
- The `/execute` limiter uses fixed-window backpressure counters (single-instance in-memory store). This is intentionally simple/testable and should be migrated to distributed Redis-style storage for multi-instance production coordination.

## `/execute` error contract

- Timeouts return `504` with `{ code: "EXEC_TIMEOUT", message, retryable, requestId }`.
- Transient Judge0/network failures return `502` with `{ code: "EXEC_UPSTREAM_ERROR", message, retryable, requestId }`.
- Non-size client validation and upstream 4xx execution rejections return `400` with `{ code: "EXEC_BAD_REQUEST", message, retryable, requestId }`.
- Oversized source/stdin payloads return `413` with `{ code: "EXEC_PAYLOAD_TOO_LARGE", message, retryable, requestId }`.
- Rate-limited requests return `429` + `Retry-After` with:
  - `code: "EXECUTE_RATE_LIMITED"`
  - `message`
  - `retryable: false`
  - `requestId`
  - `details.scope` (`user_burst` | `user_sustained` | `course`)
  - `details.retryAfterSeconds`
  - optional `details.limit`, `details.windowSeconds`, `details.remaining`
- Identity keying:
  - User key resolves from authenticated principal id, falling back to `x-user-id`.
  - Course key resolves from `courseId` body field, then `x-course-id` header, and is accepted only when that user is enrolled in the referenced course (membership checks are cached briefly to reduce repeated DB lookups during run loops).
  - If course identity is missing, the backend applies the most restrictive available policy (user burst + sustained only) and logs the missing-course fallback.

## `/execute` rate-limit tuning guidance

- **Burst control** (`EXEC_RATE_LIMIT_USER_BURST_*`) protects Judge0 and editor responsiveness from rapid-fire loops.
- **Sustained control** (`EXEC_RATE_LIMIT_USER_SUSTAINED_*`) protects capacity from prolonged overuse.
- **Course control** (`EXEC_RATE_LIMIT_COURSE_*`) prevents coordinated class spikes.
- Start with defaults:
  - user burst: `8 / 60s`
  - user sustained: `60 / 900s`
  - course: `300 / 300s`
- Monitor blocked-vs-allowed ratios (`execute_rate_limit_blocked_total`, `execute_rate_limit_allowed_total`) and adjust thresholds to balance normal classroom bursts against abuse prevention.

## `/execute` output truncation contract

- `stdout`, `stderr`, and `compile_output` are each capped to `EXEC_MAX_OUTPUT_KB` per field.
- Every execute response includes:
  - `truncation.stdout`
  - `truncation.stderr`
  - `truncation.compile_output`
- Each truncation entry has:
  - `truncated` (`true` when the field was capped)
  - `originalSizeBytes`
  - `maxSizeBytes`
- Truncation is UTF-8 safe and appends `"[output truncated]"` when content is shortened.

## Frontend preflight limit vars

Set these in frontend env so the editor can warn before oversized submissions:

- `VITE_EXEC_MAX_SOURCE_KB` (defaults to `64` when unset/invalid)
- `VITE_EXEC_MAX_STDIN_KB` (defaults to `8` when unset/invalid)

## Provider-agnostic examples

RapidAPI-hosted Judge0:

```dotenv
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=<your-rapidapi-key>
EXEC_TIMEOUT_MS=12000
EXEC_MAX_SOURCE_KB=64
EXEC_MAX_STDIN_KB=8
EXEC_MAX_OUTPUT_KB=32
EXEC_RATE_LIMIT_ENABLED=true
EXEC_RATE_LIMIT_KEY_PREFIX=execute
EXEC_RATE_LIMIT_USER_BURST_MAX=8
EXEC_RATE_LIMIT_USER_BURST_WINDOW_SEC=60
EXEC_RATE_LIMIT_USER_SUSTAINED_MAX=60
EXEC_RATE_LIMIT_USER_SUSTAINED_WINDOW_SEC=900
EXEC_RATE_LIMIT_COURSE_MAX=300
EXEC_RATE_LIMIT_COURSE_WINDOW_SEC=300
```

Self-hosted Judge0:

```dotenv
JUDGE0_BASE_URL=https://judge0.your-domain.tld
JUDGE0_API_KEY=<your-service-token>
EXEC_TIMEOUT_MS=12000
EXEC_MAX_SOURCE_KB=64
EXEC_MAX_STDIN_KB=8
EXEC_MAX_OUTPUT_KB=32
EXEC_RATE_LIMIT_ENABLED=true
EXEC_RATE_LIMIT_KEY_PREFIX=execute
EXEC_RATE_LIMIT_USER_BURST_MAX=8
EXEC_RATE_LIMIT_USER_BURST_WINDOW_SEC=60
EXEC_RATE_LIMIT_USER_SUSTAINED_MAX=60
EXEC_RATE_LIMIT_USER_SUSTAINED_WINDOW_SEC=900
EXEC_RATE_LIMIT_COURSE_MAX=300
EXEC_RATE_LIMIT_COURSE_WINDOW_SEC=300
```
