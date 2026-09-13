import { z } from 'zod'
import { AppError } from '../../lib.js'
import { resolveExecutionConfig, type ExecutionConfig } from '../../config/executionConfig.js'

export const JUDGE0_LANGUAGE_MAP: Record<string, number> = {
  javascript: 93,
  typescript: 94,
  python: 92,
  java: 91,
  c: 104,
  cpp: 105,
  csharp: 51,
  html: -1,
  web: -1,
  php: 68,
  ruby: 72,
  go: 95,
  rust: 73,
  swift: 83,
  kotlin: 78,
}

export const executeResponseSchema = z.object({
  stdout: z.string().nullable(),
  stderr: z.string().nullable(),
  compile_output: z.string().nullable(),
  truncation: z.object({
    stdout: z.object({
      truncated: z.boolean(),
      originalSizeBytes: z.int(),
      maxSizeBytes: z.int(),
    }),
    stderr: z.object({
      truncated: z.boolean(),
      originalSizeBytes: z.int(),
      maxSizeBytes: z.int(),
    }),
    compile_output: z.object({
      truncated: z.boolean(),
      originalSizeBytes: z.int(),
      maxSizeBytes: z.int(),
    }),
  }),
  status: z.object({
    id: z.int(),
    description: z.string(),
  }),
  time: z.string().nullable(),
  memory: z.int().nullable(),
})

export const executeErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  requestId: z.string(),
})

export type ExecuteResponse = z.infer<typeof executeResponseSchema>
export type ExecuteErrorResponse = z.infer<typeof executeErrorResponseSchema>
export type ExecuteErrorCode =
  | 'EXEC_BAD_REQUEST'
  | 'EXEC_FORBIDDEN'
  | 'EXEC_INTERNAL_ERROR'
  | 'EXEC_NOT_CONFIGURED'
  | 'EXEC_PAYLOAD_TOO_LARGE'
  | 'EXEC_TIMEOUT'
  | 'EXEC_UNAUTHORIZED'
  | 'EXEC_UPSTREAM_ERROR'

interface Judge0Failure {
  statusCode?: number | null
  isNetworkError?: boolean
  isTimeout?: boolean
}

const EXEC_TRANSIENT_RETRIES = 1
const EXEC_RETRY_BASE_DELAY_MS = 150
const EXEC_RETRY_JITTER_MS = 75

const createExecuteError = ({
  statusCode,
  code,
  message,
  retryable,
  expose = true,
}: {
  statusCode: number
  code: ExecuteErrorCode
  message: string
  retryable: boolean
  expose?: boolean
}) => new AppError(statusCode, message, undefined, expose, code, retryable)

export const isRetryableJudge0Failure = ({ statusCode, isNetworkError = false, isTimeout = false }: Judge0Failure) =>
  isTimeout || isNetworkError || (typeof statusCode === 'number' && statusCode >= 500)

export const isExecuteRoute = (url: string) => url === '/execute' || url.startsWith('/execute?')

export const getExecuteErrorCode = (statusCode: number): ExecuteErrorCode => {
  switch (statusCode) {
    case 400:
      return 'EXEC_BAD_REQUEST'
    case 401:
      return 'EXEC_UNAUTHORIZED'
    case 403:
      return 'EXEC_FORBIDDEN'
    case 413:
      return 'EXEC_PAYLOAD_TOO_LARGE'
    case 502:
    case 503:
      return 'EXEC_UPSTREAM_ERROR'
    case 504:
      return 'EXEC_TIMEOUT'
    default:
      return 'EXEC_INTERNAL_ERROR'
  }
}

export const toExecuteErrorResponse = (error: unknown, requestId: string) => {
  const fastifyError = error as { statusCode?: number; name?: string; message?: string }
  const statusCode =
    error instanceof AppError
      ? error.statusCode
      : fastifyError.statusCode && fastifyError.statusCode >= 400
        ? fastifyError.statusCode
        : 500
  const code = error instanceof AppError && error.code ? error.code : getExecuteErrorCode(statusCode)
  const retryable =
    error instanceof AppError
      ? error.retryable
      : code === 'EXEC_TIMEOUT' || code === 'EXEC_UPSTREAM_ERROR'
  const message =
    error instanceof AppError && error.expose
      ? error.message
      : statusCode >= 500
        ? 'Internal Server Error'
        : fastifyError.message ?? 'Request failed'

  return {
    statusCode,
    body: {
      code,
      message,
      retryable,
      requestId,
    },
  }
}

export const executeWithJudge0 = async ({
  language,
  code,
  stdin,
  config,
}: {
  language: string
  code: string
  stdin?: string | null
  config?: ExecutionConfig
}): Promise<ExecuteResponse> => {
  if (!(language in JUDGE0_LANGUAGE_MAP)) {
    throw createExecuteError({
      statusCode: 400,
      code: 'EXEC_BAD_REQUEST',
      message: `Unsupported language: ${language}`,
      retryable: false,
    })
  }

  const resolvedConfig = config ?? resolveExecutionConfig(process.env).config

  if (language === 'html' || language === 'web') {
    const webPreviewMessage = '(Web project is rendered in the browser preview — no server execution needed)'
    const webPreviewMessageBytes = Buffer.byteLength(webPreviewMessage, 'utf8')
    const maxOutputBytes = resolvedConfig ? resolvedConfig.maxOutputKb * 1024 : webPreviewMessageBytes
    return {
      stdout: webPreviewMessage,
      stderr: null,
      compile_output: null,
      truncation: {
        stdout: {
          truncated: false,
          originalSizeBytes: webPreviewMessageBytes,
          maxSizeBytes: maxOutputBytes,
        },
        stderr: {
          truncated: false,
          originalSizeBytes: 0,
          maxSizeBytes: maxOutputBytes,
        },
        compile_output: {
          truncated: false,
          originalSizeBytes: 0,
          maxSizeBytes: maxOutputBytes,
        },
      },
      status: { id: 3, description: 'Accepted' },
      time: null,
      memory: null,
    }
  }

  if (!resolvedConfig) {
   throw createExecuteError({
     statusCode: 503,
     code: 'EXEC_NOT_CONFIGURED',
     message: 'Code execution is not configured. Check execution environment variables.',
     retryable: false,
   })
  }

  const judge0ApiUrl = resolvedConfig.judge0BaseUrl
  const judge0ApiKey = resolvedConfig.judge0ApiKey
  const judge0Host = new URL(judge0ApiUrl).hostname
  const isRapidApiJudge0 = /(^|\.)p\.rapidapi\.com$/i.test(judge0Host)

  const requestTimeoutMs = resolvedConfig.timeoutMs
  const pollDelayMs = 300
  const deadlineAt = Date.now() + requestTimeoutMs

  const headers = {
   'Content-Type': 'application/json',
    ...(isRapidApiJudge0 && judge0ApiKey
      ? {
          'X-RapidAPI-Key': judge0ApiKey,
          'X-RapidAPI-Host': judge0Host,
        }
      : {}),
  }

  const getRemainingTimeMs = () => deadlineAt - Date.now()
  const createTimeoutError = () =>
    createExecuteError({
      statusCode: 504,
      code: 'EXEC_TIMEOUT',
      message: 'Code execution timed out. Try again with smaller input.',
      retryable: true,
    })
  const waitFor = async (delayMs: number) => {
    if (delayMs <= 0) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  const waitBeforeRetry = async (attempt: number) => {
    const remainingMs = getRemainingTimeMs()
    if (remainingMs <= 0) {
      throw createTimeoutError()
    }
    const jitterMs = Math.floor(Math.random() * EXEC_RETRY_JITTER_MS)
    await waitFor(Math.min(remainingMs, EXEC_RETRY_BASE_DELAY_MS * (attempt + 1) + jitterMs))
  }
  const parseJudge0Json = async <T>(response: Response): Promise<T> => {
    try {
      return (await response.json()) as T
    } catch {
      throw createExecuteError({
        statusCode: 502,
        code: 'EXEC_UPSTREAM_ERROR',
        message: 'Execution service returned an invalid response. Please try again.',
        retryable: true,
      })
    }
  }
  const toUpstreamResponseError = async (response: Response) => {
    const text = (await response.text().catch(() => '')).trim().slice(0, 200)
    if (response.status >= 500) {
      return createExecuteError({
        statusCode: 502,
        code: 'EXEC_UPSTREAM_ERROR',
        message: 'Execution service temporarily unavailable. Please try again.',
        retryable: true,
      })
    }
    if (response.status >= 400) {
      return createExecuteError({
        statusCode: 400,
        code: 'EXEC_BAD_REQUEST',
        message: text
          ? `Execution request was rejected by the execution service: ${text}`
          : 'Execution request was rejected by the execution service.',
        retryable: false,
      })
    }

    return createExecuteError({
      statusCode: 502,
      code: 'EXEC_UPSTREAM_ERROR',
      message: 'Execution service returned an unexpected response. Please try again.',
      retryable: true,
    })
  }
  const fetchWithRetry = async (path: string, init: RequestInit) => {
    for (let attempt = 0; attempt <= EXEC_TRANSIENT_RETRIES; attempt += 1) {
      const remainingMs = getRemainingTimeMs()
      if (remainingMs <= 0) {
        throw createTimeoutError()
      }

      const controller = new AbortController()
      let didTimeout = false
      const timeoutId = setTimeout(() => {
        didTimeout = true
        controller.abort()
      }, remainingMs)

      try {
        const response = await fetch(`${judge0ApiUrl}${path}`, {
          ...init,
          signal: controller.signal,
        })

        if (!response.ok) {
          if (isRetryableJudge0Failure({ statusCode: response.status }) && attempt < EXEC_TRANSIENT_RETRIES) {
            await waitBeforeRetry(attempt)
            continue
          }
          throw await toUpstreamResponseError(response)
        }

        return response
      } catch (error) {
        if (error instanceof AppError) {
          throw error
        }
        const errorName = error instanceof Error ? error.name : undefined
        const isAbortError = errorName === 'AbortError'
        const isNetworkError = error instanceof TypeError
        const isTimeoutError = didTimeout || errorName === 'TimeoutError' || (isAbortError && getRemainingTimeMs() <= 0)

        if (isRetryableJudge0Failure({ isNetworkError, isTimeout: isTimeoutError }) && attempt < EXEC_TRANSIENT_RETRIES) {
          await waitBeforeRetry(attempt)
          continue
        }
        if (isTimeoutError) {
          throw createTimeoutError()
        }
        if (isAbortError) {
          throw createExecuteError({
            statusCode: 502,
            code: 'EXEC_UPSTREAM_ERROR',
            message: 'Execution request was interrupted before completion. Please try again.',
            retryable: true,
          })
        }
        throw createExecuteError({
          statusCode: 502,
          code: 'EXEC_UPSTREAM_ERROR',
          message: 'Execution service temporarily unavailable. Please try again.',
          retryable: true,
        })
      } finally {
        clearTimeout(timeoutId)
      }
    }

    throw createExecuteError({
      statusCode: 502,
      code: 'EXEC_UPSTREAM_ERROR',
      message: 'Execution service temporarily unavailable. Please try again.',
      retryable: true,
    })
  }

  const submitResponse = await fetchWithRetry('/submissions?base64_encoded=false&wait=false', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_code: code,
      language_id: JUDGE0_LANGUAGE_MAP[language],
      stdin: stdin ?? '',
    }),
  })

  const tokenPayload = await parseJudge0Json<{ token?: string | null }>(submitResponse)
  const token = tokenPayload.token?.trim()
  if (!token) {
    throw createExecuteError({
      statusCode: 502,
      code: 'EXEC_UPSTREAM_ERROR',
      message: 'Execution service did not return a submission token. Please try again.',
      retryable: true,
    })
  }

  interface Judge0Result {
    stdout: string | null
    stderr: string | null
    compile_output: string | null
    status?: {
      id: number
      description: string
    }
    time?: string | null
    memory?: number | null
  }

  const pendingStatus = new Set([1, 2])
  let result: Judge0Result | null = null
  while (getRemainingTimeMs() > 0) {
    const pollResponse = await fetchWithRetry(`/submissions/${token}?base64_encoded=false`, {
      method: 'GET',
      headers,
    })

    result = await parseJudge0Json<Judge0Result>(pollResponse)
    const statusId = result.status?.id
    if (statusId === undefined || !pendingStatus.has(statusId)) {
      break
    }

    await waitFor(Math.min(getRemainingTimeMs(), pollDelayMs))
  }

  if (!result || pendingStatus.has(result.status?.id ?? -1)) {
    throw createTimeoutError()
  }

  const maxOutputBytes = resolvedConfig.maxOutputKb * 1024
  const truncationSuffix = '\n[output truncated]'
  const truncationSuffixBytes = Buffer.byteLength(truncationSuffix, 'utf8')
  const truncateOutput = (value: string | null) => {
    const originalSizeBytes = value ? Buffer.byteLength(value, 'utf8') : 0
    if (!value) {
      return {
        value: null,
        metadata: {
          truncated: false,
          originalSizeBytes,
          maxSizeBytes: maxOutputBytes,
        },
      }
    }
    if (originalSizeBytes <= maxOutputBytes) {
      return {
        value,
        metadata: {
          truncated: false,
          originalSizeBytes,
          maxSizeBytes: maxOutputBytes,
        },
      }
    }
    const outputBudgetBytes = Math.max(0, maxOutputBytes - truncationSuffixBytes)
    let safeOutput = ''
    let safeBytes = 0
    for (const character of value) {
      const characterBytes = Buffer.byteLength(character, 'utf8')
      if (safeBytes + characterBytes > outputBudgetBytes) {
        break
      }
      safeOutput += character
      safeBytes += characterBytes
    }
    return {
      value: `${safeOutput}${truncationSuffix}`,
      metadata: {
        truncated: true,
        originalSizeBytes,
        maxSizeBytes: maxOutputBytes,
      },
    }
  }

  const truncatedStdout = truncateOutput(result.stdout ?? null)
  const truncatedStderr = truncateOutput(result.stderr ?? null)
  const truncatedCompileOutput = truncateOutput(result.compile_output ?? null)

  return {
    stdout: truncatedStdout.value,
    stderr: truncatedStderr.value,
    compile_output: truncatedCompileOutput.value,
    truncation: {
      stdout: truncatedStdout.metadata,
      stderr: truncatedStderr.metadata,
      compile_output: truncatedCompileOutput.metadata,
    },
    status: result.status ?? {
      id: 11,
      description: 'Runtime Error',
    },
    time: result.time ?? null,
    memory: result.memory ?? null,
  }
}
