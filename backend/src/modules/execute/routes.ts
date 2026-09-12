import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../../lib.js'
import { executeResponseSchema, executeWithJudge0 } from './judge0.js'

const executeBodySchema = z.object({
  language: z.string().trim().min(1),
  code: z.string().trim().min(1).max(50_000),
  stdin: z.string().max(4096).optional().nullable(),
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
      return executeWithJudge0(payload)
    },
  )
}
