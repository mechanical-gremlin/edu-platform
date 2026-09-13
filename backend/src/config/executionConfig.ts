import { z } from 'zod'

const EXEC_TIMEOUT_MIN_MS = 1_000
const EXEC_TIMEOUT_MAX_MS = 60_000
const EXEC_LIMIT_MIN_KB = 1
const EXEC_LIMIT_MAX_KB = 1_024
const UPSTREAM_HEALTH_TIMEOUT_MS = 2_000
const UPSTREAM_HEALTH_CACHE_MS = 30_000

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
})

export interface ExecutionConfig {
  judge0BaseUrl: string
  judge0ApiKey: string
  timeoutMs: number
  maxSourceKb: number
  maxStdinKb: number
  maxOutputKb: number
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

  let status: ExecutionUpstreamStatus = 'unreachable'
  try {
    const response = await fetch(config.judge0BaseUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(UPSTREAM_HEALTH_TIMEOUT_MS),
    })
    status = response.ok ? 'reachable' : 'unreachable'
  } catch {
    status = 'unreachable'
  }

  upstreamStatusCache = {
    url: config.judge0BaseUrl,
    status,
    checkedAt: now,
  }
  return status
}
