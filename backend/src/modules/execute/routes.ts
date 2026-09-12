import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AppError, requireUser } from '../../lib.js'

const DEFAULT_JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com'

// Maps our internal language keys to Judge0 language IDs.
const JUDGE0_LANGUAGE_MAP: Record<string, number> = {
  javascript: 93,
  typescript: 94,
  python: 92,
  java: 91,
  c: 104,
  cpp: 105,
  csharp: 51,
  html: -1, // short-circuited below — never sent to Judge0
  web: -1, // short-circuited below — never sent to Judge0
  php: 68,
  ruby: 72,
  go: 95,
  rust: 73,
  swift: 83,
  kotlin: 78,
}

const executeBodySchema = z.object({
  language: z.string().trim().min(1),
  code: z.string().trim().min(1).max(50_000),
  stdin: z.string().max(4096).optional().nullable(),
})

const executeResponseSchema = z.object({
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

export const executeRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/execute',
    {
      schema: {
        body: executeBodySchema,
        response: {
          200: executeResponseSchema,
        },
      },
    },
    async (request) => {
      requireUser(request)

      const payload = executeBodySchema.parse(request.body)

      if (!JUDGE0_LANGUAGE_MAP[payload.language]) {
        throw new AppError(400, `Unsupported language: ${payload.language}`)
      }

      // HTML and web projects are rendered client-side; no server execution needed.
      if (payload.language === 'html' || payload.language === 'web') {
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
      const judge0Host = new URL(judge0ApiUrl).hostname
      const isRapidApiJudge0 = judge0Host.endsWith('rapidapi.com')

      if (isRapidApiJudge0 && !judge0ApiKey) {
        throw new AppError(503, 'Code execution is not configured. Set JUDGE0_API_KEY in backend environment variables.')
      }

      const judge0Response = await fetch(`${judge0ApiUrl}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(judge0ApiKey
            ? {
                'X-RapidAPI-Key': judge0ApiKey,
                'X-RapidAPI-Host': judge0Host,
              }
            : {}),
        },
        body: JSON.stringify({
          source_code: payload.code,
          language_id: JUDGE0_LANGUAGE_MAP[payload.language],
          stdin: payload.stdin ?? '',
        }),
      })

      if (!judge0Response.ok) {
        const text = await judge0Response.text().catch(() => '')
        throw new AppError(502, `Code execution service error: ${judge0Response.status} ${text.slice(0, 200)}`)
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

      const result = (await judge0Response.json()) as Judge0Result
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
    },
  )
}
