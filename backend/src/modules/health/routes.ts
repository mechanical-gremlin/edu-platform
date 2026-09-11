import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/',
    {
      schema: {
        response: {
          200: z.object({
            service: z.literal('edu-platform-api'),
            status: z.literal('ok'),
            health: z.literal('/health'),
          }),
        },
      },
    },
    async () => ({
      service: 'edu-platform-api',
      status: 'ok',
      health: '/health',
    }),
  )

  app.get(
    '/health',
    {
      schema: {
        response: {
          200: z.object({ status: z.literal('ok') }),
        },
      },
    },
    async () => ({ status: 'ok' }),
  )
}
