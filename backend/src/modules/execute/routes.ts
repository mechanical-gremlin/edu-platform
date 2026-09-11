import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AppError, requireUser } from '../../lib.js'

// Judge0 language IDs for the languages exposed in the UI.
// Full list: https://ce.judge0.com/languages
const LANGUAGE_IDS: Record<string, number> = {
  javascript: 93,  // Node.js 18
  typescript: 94,  // TypeScript 5
  python: 92,      // Python 3.11
  java: 91,        // Java 17
  c: 104,          // C (GCC 13)
  cpp: 105,        // C++ (GCC 13)
  csharp: 51,      // C# Mono
  html: 87,        // HTML (in-browser preview only)
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

      const apiKey = process.env.JUDGE0_API_KEY?.trim()
      const apiUrl = (process.env.JUDGE0_API_URL ?? 'https://judge0-ce.p.rapidapi.com').replace(/\/+$/, '')

      if (!apiKey) {
        throw new AppError(503, 'Code execution is not configured on this server')
      }

      const payload = executeBodySchema.parse(request.body)
      const languageId = LANGUAGE_IDS[payload.language]

      if (!languageId) {
        throw new AppError(400, `Unsupported language: ${payload.language}`)
      }

      // HTML is rendered client-side; do not forward to Judge0.
      if (payload.language === 'html') {
        return {
          stdout: '(HTML is rendered in the browser preview — no server execution needed)',
          stderr: null,
          compile_output: null,
          status: { id: 3, description: 'Accepted' },
          time: null,
          memory: null,
        }
      }

      // Submit to Judge0 and wait for result in a single call (wait=true).
      const submitResponse = await fetch(`${apiUrl}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': new URL(apiUrl).hostname,
        },
        body: JSON.stringify({
          source_code: payload.code,
          language_id: languageId,
          stdin: payload.stdin ?? null,
        }),
      })

      if (!submitResponse.ok) {
        const text = await submitResponse.text().catch(() => '')
        throw new AppError(502, `Code execution service error: ${submitResponse.status} ${text.slice(0, 200)}`)
      }

      interface Judge0Result {
        stdout: string | null
        stderr: string | null
        compile_output: string | null
        status: { id: number; description: string }
        time: string | null
        memory: number | null
      }

      const result = (await submitResponse.json()) as Judge0Result
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        compile_output: result.compile_output,
        status: result.status,
        time: result.time,
        memory: result.memory,
      }
    },
  )
}
