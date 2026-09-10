import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

export const healthRoutes: FastifyPluginAsync = async (app) => {
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
