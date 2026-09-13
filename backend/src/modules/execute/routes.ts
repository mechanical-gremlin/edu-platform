import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AppError, requireUser } from '../../lib.js'
import type { ExecutionConfigState } from '../../config/executionConfig.js'
import { bytesFromKb } from '../../config/executionConfig.js'
import { executeResponseSchema, executeWithJudge0 } from './judge0.js'

interface ExecuteRoutesOptions {
  executionConfigState: ExecutionConfigState
}

export const executeRoutes: FastifyPluginAsync<ExecuteRoutesOptions> = async (app, options) => {
  const executeBodySchema = z.object({
    language: z.string().trim().min(1),
    code: z.string().trim().min(1),
    stdin: z.string().optional().nullable(),
  })

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

      if (!options.executionConfigState.config) {
        throw new AppError(
          503,
          `Code execution is not configured. ${options.executionConfigState.errors.join(' ')}`,
          undefined,
          true,
        )
      }

      const payload = executeBodySchema.parse(request.body)
      const maxSourceBytes = bytesFromKb(options.executionConfigState.config.maxSourceKb)
      const maxStdinBytes = bytesFromKb(options.executionConfigState.config.maxStdinKb)
      if (Buffer.byteLength(payload.code, 'utf8') > maxSourceBytes) {
        throw new AppError(
          400,
          `Source code exceeds EXEC_MAX_SOURCE_KB (${options.executionConfigState.config.maxSourceKb} KB).`,
        )
      }
      if (Buffer.byteLength(payload.stdin ?? '', 'utf8') > maxStdinBytes) {
        throw new AppError(
          400,
          `Standard input exceeds EXEC_MAX_STDIN_KB (${options.executionConfigState.config.maxStdinKb} KB).`,
        )
      }

      return executeWithJudge0({
        ...payload,
        config: options.executionConfigState.config,
      })
    },
  )
}
