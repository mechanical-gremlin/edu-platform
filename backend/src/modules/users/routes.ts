import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../../lib.js'

const meResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.enum(['teacher', 'student']),
})

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/me',
    {
      schema: {
        response: {
          200: meResponseSchema,
        },
      },
    },
    async (request) => {
      const user = requireUser(request)
      return meResponseSchema.parse(user)
    },
  )
}
