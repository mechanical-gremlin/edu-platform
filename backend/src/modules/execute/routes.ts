import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AppError, requireUser } from '../../lib.js'
import type { ExecutionConfigState } from '../../config/executionConfig.js'
import { bytesFromKb } from '../../config/executionConfig.js'
import { executeErrorResponseSchema, executeResponseSchema, executeWithJudge0 } from './judge0.js'
import { evaluateExecuteRateLimit, hashIdentity, InMemoryRateLimitStore } from './rateLimit.js'
import {
  normalizeProjectWorkspaceFiles,
  projectWorkspaceFileSchema,
  resolveWorkspaceEntrypoint,
} from './projectWorkspace.js'

interface ExecuteRoutesOptions {
  executionConfigState: ExecutionConfigState
}

export const executeRoutes: FastifyPluginAsync<ExecuteRoutesOptions> = async (app, options) => {
  const rateLimitStore = new InMemoryRateLimitStore()
  const enrollmentCache = new Map<string, { allowed: boolean; expiresAtMs: number }>()
  const enrollmentCacheTtlMs = 30_000
  let enrollmentCacheNextCleanupAtMs = 0

  const pruneEnrollmentCache = (nowMs: number) => {
    if (nowMs < enrollmentCacheNextCleanupAtMs) {
      return
    }
    for (const [key, value] of enrollmentCache) {
      if (value.expiresAtMs <= nowMs) {
        enrollmentCache.delete(key)
      }
    }
    enrollmentCacheNextCleanupAtMs = nowMs + enrollmentCacheTtlMs
  }
  const executeBodySchema = z.object({
    language: z.string().trim().min(1),
    code: z.string().optional().nullable(),
    stdin: z.string().optional().nullable(),
    files: z.array(projectWorkspaceFileSchema).max(50).optional().nullable(),
    entrypoint: z.string().trim().optional().nullable(),
    courseId: z.string().trim().min(1).optional().nullable(),
  }).superRefine((value, context) => {
    const hasCode = typeof value.code === 'string' && value.code.trim().length > 0
    const hasFiles = Array.isArray(value.files) && value.files.length > 0
    if (!hasCode && !hasFiles) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['code'],
        message: 'Code is required when no project workspace files are provided.',
      })
    }
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
      const userKey = request.user?.id ?? null
      const headerCourseId = request.headers['x-course-id']
      const requestedCourseKey = payload.courseId ?? (Array.isArray(headerCourseId) ? headerCourseId[0] : headerCourseId) ?? null
      let courseKey: string | null = null

      if (requestedCourseKey && userKey) {
        const cacheKey = `${userKey}:${requestedCourseKey}`
        const nowMs = Date.now()
        pruneEnrollmentCache(nowMs)
        const cachedEnrollment = enrollmentCache.get(cacheKey)
        if (cachedEnrollment?.expiresAtMs && cachedEnrollment.expiresAtMs > nowMs && !cachedEnrollment.allowed) {
          throw new AppError(403, 'Course context is invalid for this user.', undefined, true, 'EXEC_FORBIDDEN', false)
        }
        if (cachedEnrollment?.expiresAtMs && cachedEnrollment.expiresAtMs > nowMs && cachedEnrollment.allowed) {
          courseKey = requestedCourseKey
        } else {
          const enrollment = await app.prisma.enrollment.findUnique({
            where: {
              userId_courseId: {
                userId: userKey,
                courseId: requestedCourseKey,
              },
            },
            select: {
              userId: true,
            },
          })
          const allowed = Boolean(enrollment)
          enrollmentCache.set(cacheKey, { allowed, expiresAtMs: nowMs + enrollmentCacheTtlMs })

          if (!allowed) {
            throw new AppError(403, 'Course context is invalid for this user.', undefined, true, 'EXEC_FORBIDDEN', false)
          }

          courseKey = requestedCourseKey
        }
      }

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

      let normalizedWorkspaceFiles:
        | ReturnType<typeof normalizeProjectWorkspaceFiles>['files']
        | null = null
      let deterministicEntrypoint: string | null = null

      if (payload.files?.length) {
        const normalized = normalizeProjectWorkspaceFiles(payload.files)
        if (!normalized.files || normalized.errorCode || normalized.errorMessage) {
          throw new AppError(400, normalized.errorMessage ?? 'Invalid project workspace file path.', undefined, true, 'FILE_PATH_INVALID', false)
        }
        normalizedWorkspaceFiles = normalized.files

        const resolvedEntrypoint = resolveWorkspaceEntrypoint({
          language: payload.language,
          files: normalizedWorkspaceFiles,
          requestedEntrypoint: payload.entrypoint,
        })
        if (!resolvedEntrypoint.entrypoint || resolvedEntrypoint.errorCode || resolvedEntrypoint.errorMessage) {
          throw new AppError(
            400,
            resolvedEntrypoint.errorMessage ?? 'Invalid entrypoint.',
            undefined,
            true,
            resolvedEntrypoint.errorCode ?? 'ENTRYPOINT_INVALID',
            false,
          )
        }
        deterministicEntrypoint = resolvedEntrypoint.entrypoint

        if (!['web', 'html'].includes(payload.language)) {
          throw new AppError(
            400,
            `Multi-file project workspace is unsupported for runtime "${payload.language}".`,
            undefined,
            true,
            'EXECUTION_FAILED',
            false,
          )
        }
      }

      const maxSourceBytes = bytesFromKb(options.executionConfigState.config.maxSourceKb)
      const maxStdinBytes = bytesFromKb(options.executionConfigState.config.maxStdinKb)
      const effectiveCode =
        normalizedWorkspaceFiles && deterministicEntrypoint
          ? normalizedWorkspaceFiles.find((file) => file.path === deterministicEntrypoint)?.content ?? ''
          : payload.code?.trim() ?? ''
      const sourceForLimits =
        normalizedWorkspaceFiles && deterministicEntrypoint
          ? JSON.stringify({
              projectWorkspace: normalizedWorkspaceFiles,
              entrypoint: deterministicEntrypoint,
            })
          : effectiveCode

      if (Buffer.byteLength(sourceForLimits, 'utf8') > maxSourceBytes) {
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
        language: payload.language,
        code: effectiveCode,
        stdin: payload.stdin,
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
