import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AppError, requireUser } from '../../lib.js'
import type { ExecutionConfigState } from '../../config/executionConfig.js'
import { bytesFromKb } from '../../config/executionConfig.js'
import { executeErrorResponseSchema, executeResponseSchema, executeWithJudge0 } from './judge0.js'
import { evaluateExecuteRateLimit, hashIdentity, InMemoryRateLimitStore } from './rateLimit.js'

interface ExecuteRoutesOptions {
  executionConfigState: ExecutionConfigState
}

export const executeRoutes: FastifyPluginAsync<ExecuteRoutesOptions> = async (app, options) => {
  const rateLimitStore = new InMemoryRateLimitStore()
  const executeBodySchema = z.object({
    language: z.string().trim().min(1),
    code: z.string().trim().min(1),
    stdin: z.string().optional().nullable(),
    courseId: z.string().trim().min(1).optional().nullable(),
  })

  app.post(
    '/execute',
    {
      schema: {
        body: executeBodySchema,
        response: {
          200: executeResponseSchema,
          400: executeErrorResponseSchema,
          413: executeErrorResponseSchema,
          429: executeErrorResponseSchema,
          401: executeErrorResponseSchema,
          403: executeErrorResponseSchema,
          500: executeErrorResponseSchema,
          502: executeErrorResponseSchema,
          503: executeErrorResponseSchema,
          504: executeErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      request.executeStartedAt = Date.now()
      requireUser(request)

      if (!options.executionConfigState.config) {
        throw new AppError(
          503,
          `Code execution is not configured. ${options.executionConfigState.errors.join(' ')}`,
          undefined,
          true,
          'EXEC_NOT_CONFIGURED',
          false,
        )
      }

      const payload = executeBodySchema.parse(request.body)
      const durationStartedAt = request.executeStartedAt ?? Date.now()
      const headerUserId = request.headers['x-user-id']
      const userKey = request.user?.id ?? (Array.isArray(headerUserId) ? headerUserId[0] : headerUserId) ?? null
      const headerCourseId = request.headers['x-course-id']
      const courseKey = payload.courseId ?? (Array.isArray(headerCourseId) ? headerCourseId[0] : headerCourseId) ?? null

      const limitDecision = evaluateExecuteRateLimit({
        store: rateLimitStore,
        config: {
          enabled: options.executionConfigState.config.rateLimitEnabled,
          keyPrefix: options.executionConfigState.config.rateLimitKeyPrefix,
          userBurstMax: options.executionConfigState.config.rateLimitUserBurstMax,
          userBurstWindowSec: options.executionConfigState.config.rateLimitUserBurstWindowSec,
          userSustainedMax: options.executionConfigState.config.rateLimitUserSustainedMax,
          userSustainedWindowSec: options.executionConfigState.config.rateLimitUserSustainedWindowSec,
          courseMax: options.executionConfigState.config.rateLimitCourseMax,
          courseWindowSec: options.executionConfigState.config.rateLimitCourseWindowSec,
        },
        identity: {
          userId: userKey,
          courseId: courseKey,
        },
      })

      if (!limitDecision.allowed) {
        reply.header('Retry-After', String(limitDecision.retryAfterSeconds))
        request.log.warn(
          {
            requestId: request.id,
            userIdHash: userKey ? hashIdentity(userKey) : null,
            courseIdHash: courseKey ? hashIdentity(courseKey) : null,
            scope: limitDecision.scope,
            retryAfterSeconds: limitDecision.retryAfterSeconds,
            limit: limitDecision.limit,
            remaining: limitDecision.remaining,
            windowSec: limitDecision.windowSeconds,
            metric: 'execute_rate_limit_blocked_total',
          },
          'execute rate limit blocked',
        )
        return reply.status(429).send({
          code: 'EXECUTE_RATE_LIMITED',
          message: 'Execution rate limit exceeded. Please retry later.',
          retryable: false,
          requestId: request.id,
          details: {
            scope: limitDecision.scope,
            retryAfterSeconds: limitDecision.retryAfterSeconds,
            limit: limitDecision.limit,
            windowSeconds: limitDecision.windowSeconds,
            remaining: limitDecision.remaining,
          },
        })
      }

      request.log.info(
        {
          requestId: request.id,
          userIdHash: userKey ? hashIdentity(userKey) : null,
          courseIdHash: courseKey ? hashIdentity(courseKey) : null,
          scope: 'all',
          windowSec: null,
          metric: 'execute_rate_limit_allowed_total',
        },
        'execute rate limit allowed',
      )

      if (!courseKey) {
        request.log.warn(
          {
            requestId: request.id,
            userIdHash: userKey ? hashIdentity(userKey) : null,
            courseIdHash: null,
          },
          'execute request missing course identity; applied user-only rate limits',
        )
      }

      const maxSourceBytes = bytesFromKb(options.executionConfigState.config.maxSourceKb)
      const maxStdinBytes = bytesFromKb(options.executionConfigState.config.maxStdinKb)
      if (Buffer.byteLength(payload.code, 'utf8') > maxSourceBytes) {
        throw new AppError(
          413,
          `Source code exceeds EXEC_MAX_SOURCE_KB (${options.executionConfigState.config.maxSourceKb} KB).`,
          undefined,
          true,
          'EXEC_PAYLOAD_TOO_LARGE',
          false,
        )
      }
      if (Buffer.byteLength(payload.stdin ?? '', 'utf8') > maxStdinBytes) {
        throw new AppError(
          413,
          `Standard input exceeds EXEC_MAX_STDIN_KB (${options.executionConfigState.config.maxStdinKb} KB).`,
          undefined,
          true,
          'EXEC_PAYLOAD_TOO_LARGE',
          false,
        )
      }

      const result = await executeWithJudge0({
        ...payload,
        config: options.executionConfigState.config,
      })

      request.log.info(
        {
          requestId: request.id,
          userId: request.user?.id ?? null,
          courseId: courseKey,
          assignmentId: null,
          runtime: payload.language,
          durationMs: Date.now() - durationStartedAt,
          outcome: 'success',
          errorCode: null,
        },
        'execution completed',
      )

      return result
    },
  )
}
