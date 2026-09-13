import { z } from 'zod'

const EXEC_TIMEOUT_MIN_MS = 1_000
const EXEC_TIMEOUT_MAX_MS = 60_000
const EXEC_LIMIT_MIN_KB = 1
const EXEC_LIMIT_MAX_KB = 1_024
const EXEC_RATE_LIMIT_MIN = 1
const EXEC_RATE_LIMIT_WINDOW_MIN_SEC = 1
const EXEC_RATE_LIMIT_WINDOW_MAX_SEC = 86_400
const UPSTREAM_HEALTH_TIMEOUT_MS = 2_000
const UPSTREAM_HEALTH_CACHE_MS = 30_000
const RAPIDAPI_HOST_PATTERN = /(^|\.)p\.rapidapi\.com$/i

const parseBooleanFlag = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value !== 'string') {
    return value
  }
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false
  }
  return value
}

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  JUDGE0_BASE_URL: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().trim().min(1, 'JUDGE0_BASE_URL is required'),
  ),
  JUDGE0_API_KEY: z.string().trim().optional().default(''),
  EXEC_TIMEOUT_MS: z.coerce
    .number()
    .int('EXEC_TIMEOUT_MS must be an integer number of milliseconds')
    .min(EXEC_TIMEOUT_MIN_MS, `EXEC_TIMEOUT_MS must be at least ${EXEC_TIMEOUT_MIN_MS}`)
    .max(EXEC_TIMEOUT_MAX_MS, `EXEC_TIMEOUT_MS must be at most ${EXEC_TIMEOUT_MAX_MS}`),
  EXEC_MAX_SOURCE_KB: z.coerce
    .number()
    .int('EXEC_MAX_SOURCE_KB must be an integer number of kilobytes')
    .min(EXEC_LIMIT_MIN_KB, `EXEC_MAX_SOURCE_KB must be at least ${EXEC_LIMIT_MIN_KB}`)
    .max(EXEC_LIMIT_MAX_KB, `EXEC_MAX_SOURCE_KB must be at most ${EXEC_LIMIT_MAX_KB}`),
  EXEC_MAX_STDIN_KB: z.coerce
    .number()
    .int('EXEC_MAX_STDIN_KB must be an integer number of kilobytes')
    .min(EXEC_LIMIT_MIN_KB, `EXEC_MAX_STDIN_KB must be at least ${EXEC_LIMIT_MIN_KB}`)
    .max(EXEC_LIMIT_MAX_KB, `EXEC_MAX_STDIN_KB must be at most ${EXEC_LIMIT_MAX_KB}`),
  EXEC_MAX_OUTPUT_KB: z.coerce
    .number()
    .int('EXEC_MAX_OUTPUT_KB must be an integer number of kilobytes')
    .min(EXEC_LIMIT_MIN_KB, `EXEC_MAX_OUTPUT_KB must be at least ${EXEC_LIMIT_MIN_KB}`)
    .max(EXEC_LIMIT_MAX_KB, `EXEC_MAX_OUTPUT_KB must be at most ${EXEC_LIMIT_MAX_KB}`),
  EXEC_RATE_LIMIT_ENABLED: z.preprocess(
    parseBooleanFlag,
    z.boolean('EXEC_RATE_LIMIT_ENABLED must be a boolean-like value (true/false)')
  ).default(true),
  EXEC_RATE_LIMIT_KEY_PREFIX: z.string().trim().min(1).default('execute'),
  EXEC_RATE_LIMIT_USER_BURST_MAX: z.coerce
    .number()
    .int('EXEC_RATE_LIMIT_USER_BURST_MAX must be an integer')
    .min(EXEC_RATE_LIMIT_MIN, `EXEC_RATE_LIMIT_USER_BURST_MAX must be at least ${EXEC_RATE_LIMIT_MIN}`)
    .default(8),
  EXEC_RATE_LIMIT_USER_BURST_WINDOW_SEC: z.coerce
    .number()
    .int('EXEC_RATE_LIMIT_USER_BURST_WINDOW_SEC must be an integer number of seconds')
    .min(
      EXEC_RATE_LIMIT_WINDOW_MIN_SEC,
      `EXEC_RATE_LIMIT_USER_BURST_WINDOW_SEC must be at least ${EXEC_RATE_LIMIT_WINDOW_MIN_SEC}`,
    )
    .max(
      EXEC_RATE_LIMIT_WINDOW_MAX_SEC,
      `EXEC_RATE_LIMIT_USER_BURST_WINDOW_SEC must be at most ${EXEC_RATE_LIMIT_WINDOW_MAX_SEC}`,
    )
    .default(60),
  EXEC_RATE_LIMIT_USER_SUSTAINED_MAX: z.coerce
    .number()
    .int('EXEC_RATE_LIMIT_USER_SUSTAINED_MAX must be an integer')
    .min(EXEC_RATE_LIMIT_MIN, `EXEC_RATE_LIMIT_USER_SUSTAINED_MAX must be at least ${EXEC_RATE_LIMIT_MIN}`)
    .default(60),
  EXEC_RATE_LIMIT_USER_SUSTAINED_WINDOW_SEC: z.coerce
    .number()
    .int('EXEC_RATE_LIMIT_USER_SUSTAINED_WINDOW_SEC must be an integer number of seconds')
    .min(
      EXEC_RATE_LIMIT_WINDOW_MIN_SEC,
      `EXEC_RATE_LIMIT_USER_SUSTAINED_WINDOW_SEC must be at least ${EXEC_RATE_LIMIT_WINDOW_MIN_SEC}`,
    )
    .max(
      EXEC_RATE_LIMIT_WINDOW_MAX_SEC,
      `EXEC_RATE_LIMIT_USER_SUSTAINED_WINDOW_SEC must be at most ${EXEC_RATE_LIMIT_WINDOW_MAX_SEC}`,
    )
    .default(900),
  EXEC_RATE_LIMIT_COURSE_MAX: z.coerce
    .number()
    .int('EXEC_RATE_LIMIT_COURSE_MAX must be an integer')
    .min(EXEC_RATE_LIMIT_MIN, `EXEC_RATE_LIMIT_COURSE_MAX must be at least ${EXEC_RATE_LIMIT_MIN}`)
    .default(300),
  EXEC_RATE_LIMIT_COURSE_WINDOW_SEC: z.coerce
    .number()
    .int('EXEC_RATE_LIMIT_COURSE_WINDOW_SEC must be an integer number of seconds')
    .min(
      EXEC_RATE_LIMIT_WINDOW_MIN_SEC,
      `EXEC_RATE_LIMIT_COURSE_WINDOW_SEC must be at least ${EXEC_RATE_LIMIT_WINDOW_MIN_SEC}`,
    )
    .max(
      EXEC_RATE_LIMIT_WINDOW_MAX_SEC,
      `EXEC_RATE_LIMIT_COURSE_WINDOW_SEC must be at most ${EXEC_RATE_LIMIT_WINDOW_MAX_SEC}`,
    )
    .default(300),
})

export interface ExecutionConfig {
  judge0BaseUrl: string
  judge0ApiKey: string
  timeoutMs: number
  maxSourceKb: number
  maxStdinKb: number
  maxOutputKb: number
  rateLimitEnabled: boolean
  rateLimitKeyPrefix: string
  rateLimitUserBurstMax: number
  rateLimitUserBurstWindowSec: number
  rateLimitUserSustainedMax: number
  rateLimitUserSustainedWindowSec: number
  rateLimitCourseMax: number
  rateLimitCourseWindowSec: number
}

export interface ExecutionConfigState {
  config: ExecutionConfig | null
  errors: string[]
}

const isProduction = (nodeEnv?: string) => nodeEnv?.toLowerCase() === 'production'

const asRecord = (env: NodeJS.ProcessEnv | Record<string, string | undefined>) =>
  env as Record<string, string | undefined>

export const resolveExecutionConfig = (env: NodeJS.ProcessEnv | Record<string, string | undefined>): ExecutionConfigState => {
  const envRecord = asRecord(env)
  const requiresApiKey = isProduction(envRecord.NODE_ENV)
  const parsed = envSchema.safeParse(envRecord)
  const errors: string[] = []

  if (!parsed.success) {
    errors.push(...parsed.error.issues.map((issue) => issue.message))
    if (requiresApiKey && !(envRecord.JUDGE0_API_KEY ?? '').trim()) {
      errors.push('JUDGE0_API_KEY is required when NODE_ENV=production')
    }
    return { config: null, errors }
  }

  let judge0BaseUrl = parsed.data.JUDGE0_BASE_URL.replace(/\/+$/, '')
  try {
    judge0BaseUrl = new URL(judge0BaseUrl).toString().replace(/\/+$/, '')
  } catch {
    errors.push('JUDGE0_BASE_URL must be a valid URL')
  }

  if (requiresApiKey && !parsed.data.JUDGE0_API_KEY) {
    errors.push('JUDGE0_API_KEY is required when NODE_ENV=production')
  }

  if (errors.length > 0) {
    return { config: null, errors }
  }

  return {
    config: {
      judge0BaseUrl,
      judge0ApiKey: parsed.data.JUDGE0_API_KEY,
      timeoutMs: parsed.data.EXEC_TIMEOUT_MS,
      maxSourceKb: parsed.data.EXEC_MAX_SOURCE_KB,
      maxStdinKb: parsed.data.EXEC_MAX_STDIN_KB,
      maxOutputKb: parsed.data.EXEC_MAX_OUTPUT_KB,
      rateLimitEnabled: parsed.data.EXEC_RATE_LIMIT_ENABLED,
      rateLimitKeyPrefix: parsed.data.EXEC_RATE_LIMIT_KEY_PREFIX,
      rateLimitUserBurstMax: parsed.data.EXEC_RATE_LIMIT_USER_BURST_MAX,
      rateLimitUserBurstWindowSec: parsed.data.EXEC_RATE_LIMIT_USER_BURST_WINDOW_SEC,
      rateLimitUserSustainedMax: parsed.data.EXEC_RATE_LIMIT_USER_SUSTAINED_MAX,
      rateLimitUserSustainedWindowSec: parsed.data.EXEC_RATE_LIMIT_USER_SUSTAINED_WINDOW_SEC,
      rateLimitCourseMax: parsed.data.EXEC_RATE_LIMIT_COURSE_MAX,
      rateLimitCourseWindowSec: parsed.data.EXEC_RATE_LIMIT_COURSE_WINDOW_SEC,
    },
    errors,
  }
}

export const assertExecutionConfigAtStartup = (state: ExecutionConfigState, env: NodeJS.ProcessEnv | Record<string, string | undefined>) => {
  if (!isProduction(asRecord(env).NODE_ENV) || state.config) {
    return
  }

  throw new Error(
    `Invalid execution configuration:\n${state.errors.map((message) => `- ${message}`).join('\n')}\n` +
      'Set the required JUDGE0_* and EXEC_* environment variables before starting the API.',
  )
}

export const bytesFromKb = (kb: number) => kb * 1024

export type ExecutionUpstreamStatus = 'reachable' | 'unreachable' | 'unknown'

let upstreamStatusCache:
  | {
      url: string
      status: ExecutionUpstreamStatus
      checkedAt: number
    }
  | undefined
let upstreamStatusInFlight:
  | {
      url: string
      promise: Promise<ExecutionUpstreamStatus>
    }
  | undefined

export const getExecutionUpstreamStatus = async (config: ExecutionConfig | null): Promise<ExecutionUpstreamStatus> => {
  if (!config) {
    return 'unknown'
  }

  const now = Date.now()
  if (
    upstreamStatusCache
    && upstreamStatusCache.url === config.judge0BaseUrl
    && now - upstreamStatusCache.checkedAt < UPSTREAM_HEALTH_CACHE_MS
  ) {
    return upstreamStatusCache.status
  }

  if (upstreamStatusInFlight?.url === config.judge0BaseUrl) {
    return upstreamStatusInFlight.promise
  }

  const probePromise = (async () => {
    let status: ExecutionUpstreamStatus = 'unreachable'
    try {
      const judge0Host = new URL(config.judge0BaseUrl).hostname
      const headers =
        RAPIDAPI_HOST_PATTERN.test(judge0Host) && config.judge0ApiKey
          ? {
              'X-RapidAPI-Key': config.judge0ApiKey,
              'X-RapidAPI-Host': judge0Host,
            }
          : undefined
      const response = await fetch(`${config.judge0BaseUrl}/languages`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(UPSTREAM_HEALTH_TIMEOUT_MS),
      })
      status = response.ok ? 'reachable' : 'unreachable'
    } catch {
      status = 'unreachable'
    }

    upstreamStatusCache = {
      url: config.judge0BaseUrl,
      status,
      checkedAt: Date.now(),
    }
    return status
  })()

  upstreamStatusInFlight = {
    url: config.judge0BaseUrl,
    promise: probePromise,
  }

  try {
    return await probePromise
  } finally {
    if (upstreamStatusInFlight?.promise === probePromise) {
      upstreamStatusInFlight = undefined
    }
  }
}
