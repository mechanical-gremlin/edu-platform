import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { ExecutionConfigState } from '../../config/executionConfig.js'
import { getExecutionUpstreamStatus } from '../../config/executionConfig.js'

interface HealthRoutesOptions {
  executionConfigState: ExecutionConfigState
}

export const healthRoutes: FastifyPluginAsync<HealthRoutesOptions> = async (app, options) => {
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
          200: z.object({
            status: z.literal('ok'),
            execution: z.object({
              configured: z.boolean(),
              upstream: z.enum(['reachable', 'unreachable', 'unknown']),
              errors: z.array(z.string()),
            }),
          }),
        },
      },
    },
    async () => ({
      status: 'ok',
      execution: {
        configured: Boolean(options.executionConfigState.config),
        upstream: await getExecutionUpstreamStatus(options.executionConfigState.config),
        errors: options.executionConfigState.errors,
      },
    }),
  )
}
