import { z } from 'zod'
import { AppError } from '../../lib.js'

const DEFAULT_JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com'

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
  status: z.object({
    id: z.int(),
    description: z.string(),
  }),
  time: z.string().nullable(),
  memory: z.int().nullable(),
})

export type ExecuteResponse = z.infer<typeof executeResponseSchema>

export const executeWithJudge0 = async ({
  language,
  code,
  stdin,
}: {
  language: string
  code: string
  stdin?: string | null
}): Promise<ExecuteResponse> => {
  if (!(language in JUDGE0_LANGUAGE_MAP)) {
    throw new AppError(400, `Unsupported language: ${language}`)
  }

  if (language === 'html' || language === 'web') {
    return {
      stdout: '(Web project is rendered in the browser preview — no server execution needed)',
      stderr: null,
      compile_output: null,
      status: { id: 3, description: 'Accepted' },
      time: null,
      memory: null,
    }
  }

  const judge0ApiUrl = process.env.JUDGE0_API_URL?.trim().replace(/\/+$/, '') || DEFAULT_JUDGE0_API_URL
  const judge0ApiKey = process.env.JUDGE0_API_KEY?.trim() || ''
  let judge0Host: string
  try {
    judge0Host = new URL(judge0ApiUrl).hostname
  } catch {
    throw new AppError(503, 'Code execution is not configured. JUDGE0_API_URL must be a valid URL.', undefined, true)
  }
  const isRapidApiJudge0 = /(^|\.)p\.rapidapi\.com$/i.test(judge0Host)

  if (isRapidApiJudge0 && !judge0ApiKey) {
    throw new AppError(
      503,
      'Code execution is not configured. Set JUDGE0_API_KEY in backend environment variables.',
      undefined,
      true,
    )
  }

  const judge0TimeoutMs = Number(process.env.JUDGE0_REQUEST_TIMEOUT_MS ?? 12_000)
  const pollIntervalMs = Number(process.env.JUDGE0_POLL_INTERVAL_MS ?? 300)
  const maxPollAttempts = Number(process.env.JUDGE0_MAX_POLL_ATTEMPTS ?? 30)
  const requestTimeoutMs = Number.isFinite(judge0TimeoutMs) && judge0TimeoutMs > 0 ? judge0TimeoutMs : 12_000
  const pollDelayMs = Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : 300
  const pollAttempts = Number.isFinite(maxPollAttempts) && maxPollAttempts > 0 ? maxPollAttempts : 30

  const headers = {
    'Content-Type': 'application/json',
    ...(isRapidApiJudge0 && judge0ApiKey
      ? {
          'X-RapidAPI-Key': judge0ApiKey,
          'X-RapidAPI-Host': judge0Host,
        }
      : {}),
  }
  const fetchWithTimeout = async (input: string, init: RequestInit) => {
    try {
      return await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(requestTimeoutMs),
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new AppError(504, 'Code execution timed out. Try again with smaller input.', undefined, true)
      }
      throw new AppError(502, 'Unable to reach code execution service.')
    }
  }

  const submitResponse = await fetchWithTimeout(`${judge0ApiUrl}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_code: code,
      language_id: JUDGE0_LANGUAGE_MAP[language],
      stdin: stdin ?? '',
    }),
  })

  if (!submitResponse.ok) {
    const text = await submitResponse.text().catch(() => '')
    throw new AppError(502, `Code execution service error: ${submitResponse.status} ${text.slice(0, 200)}`)
  }

  const tokenPayload = (await submitResponse.json()) as { token?: string | null }
  const token = tokenPayload.token?.trim()
  if (!token) {
    throw new AppError(502, 'Code execution service error: missing submission token')
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
  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    const pollResponse = await fetchWithTimeout(`${judge0ApiUrl}/submissions/${token}?base64_encoded=false`, {
      method: 'GET',
      headers,
    })

    if (!pollResponse.ok) {
      const text = await pollResponse.text().catch(() => '')
      throw new AppError(502, `Code execution service error: ${pollResponse.status} ${text.slice(0, 200)}`)
    }

    result = (await pollResponse.json()) as Judge0Result
    const statusId = result.status?.id
    if (statusId === undefined || !pendingStatus.has(statusId)) {
      break
    }

    if (attempt < pollAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, pollDelayMs))
    }
  }

  if (!result || pendingStatus.has(result.status?.id ?? -1)) {
    throw new AppError(504, 'Code execution timed out. Try again with smaller input.', undefined, true)
  }

  return {
    stdout: result.stdout ?? null,
    stderr: result.stderr ?? null,
    compile_output: result.compile_output ?? null,
    status: result.status ?? {
      id: 11,
      description: 'Runtime Error',
    },
    time: result.time ?? null,
    memory: result.memory ?? null,
  }
}
