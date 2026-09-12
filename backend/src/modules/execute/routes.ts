import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AppError, requireUser } from '../../lib.js'

const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute'

// Maps our internal language keys to Piston runtime language slugs.
// Full list: GET https://emkc.org/api/v2/piston/runtimes
const PISTON_LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python:     'python',
  java:       'java',
  c:          'c',
  cpp:        'c++',
  csharp:     'csharp',
  html:       'html',     // short-circuited below — never sent to Piston
  web:        'web',      // short-circuited below — never sent to Piston
  php:        'php',
  ruby:       'ruby',
  go:         'go',
  rust:       'rust',
  swift:      'swift',
  kotlin:     'kotlin',
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

      if (!PISTON_LANGUAGE_MAP[payload.language]) {
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

      // Submit to Piston (no API key required).
      const pistonResponse = await fetch(PISTON_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: PISTON_LANGUAGE_MAP[payload.language],
          version: '*',
          files: [{ content: payload.code }],
          stdin: payload.stdin ?? '',
        }),
      })

      if (!pistonResponse.ok) {
        const text = await pistonResponse.text().catch(() => '')
        throw new AppError(502, `Code execution service error: ${pistonResponse.status} ${text.slice(0, 200)}`)
      }

      interface PistonStage {
        stdout: string
        stderr: string
        code: number | null
        signal: string | null
        output: string
      }
      interface PistonResult {
        run: PistonStage
        compile?: PistonStage
      }

      const result = (await pistonResponse.json()) as PistonResult
      const run = result.run
      const compile = result.compile

      const accepted = run.code === 0 && !compile?.code
      const compileError = compile !== undefined && compile.code !== 0
      return {
        stdout: run.stdout || null,
        stderr: run.stderr || null,
        compile_output: compile?.stderr || null,
        status: {
          id: compileError ? 6 : accepted ? 3 : 11,
          description: compileError ? 'Compilation Error' : accepted ? 'Accepted' : 'Runtime Error',
        },
        time: null,
        memory: null,
      }
    },
  )
}
