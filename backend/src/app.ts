import Fastify from 'fastify'
import cors from '@fastify/cors'
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod'
import type { PrismaClient } from '@prisma/client'
import { dbPlugin } from './plugins/db.js'
import { authPlugin } from './plugins/auth.js'
import { loggingPlugin } from './plugins/logging.js'
import { executeRoutes } from './modules/execute/routes.js'
import { healthRoutes } from './modules/health/routes.js'
import { userRoutes } from './modules/users/routes.js'
import { courseRoutes } from './modules/courses/routes.js'
import { gradeRoutes } from './modules/grades/routes.js'
import { progressRoutes } from './modules/progress/routes.js'
import { AppError } from './lib.js'
import { assertExecutionConfigAtStartup, resolveExecutionConfig } from './config/executionConfig.js'
import { isExecuteRoute, toExecuteErrorResponse } from './modules/execute/judge0.js'

interface BuildAppOptions {
  prisma?: PrismaClient
}

export const buildApp = async (options: BuildAppOptions = {}) => {
  const executionConfigState = resolveExecutionConfig(process.env)
  assertExecutionConfigAtStartup(executionConfigState, process.env)

  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.decorateRequest('executeStartedAt', null)
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  app.addHook('onSend', (_request, reply, _payload, done) => {
    reply.header('Cross-Origin-Opener-Policy', 'same-origin')
    done()
  })

  app.setErrorHandler((error, request, reply) => {
    if (isExecuteRoute(request.url)) {
      const { statusCode, body } = toExecuteErrorResponse(error, request.id)
      const requestBody = typeof request.body === 'object' && request.body !== null ? (request.body as Record<string, unknown>) : {}
      const executeStartedAt = request.executeStartedAt ?? Date.now()
      const headerUserId = request.headers['x-user-id']

      request.log.warn(
        {
          requestId: request.id,
          userId: request.user?.id ?? (Array.isArray(headerUserId) ? headerUserId[0] : headerUserId) ?? null,
          courseId: typeof requestBody.courseId === 'string' ? requestBody.courseId : null,
          assignmentId: typeof requestBody.assignmentId === 'string' ? requestBody.assignmentId : null,
          runtime: typeof requestBody.language === 'string' ? requestBody.language : null,
          durationMs: Date.now() - executeStartedAt,
          outcome: 'error',
          errorCode: body.code,
        },
        'execution failed',
      )

      reply.status(statusCode).send(body)
      return
    }

    const fastifyError = error as { statusCode?: number; name?: string; message?: string }
    const statusCode =
      error instanceof AppError
        ? error.statusCode
        : fastifyError.statusCode && fastifyError.statusCode >= 400
          ? fastifyError.statusCode
          : 500
    const errorName = error instanceof AppError ? error.error : fastifyError.name || 'Error'
    const message =
      error instanceof AppError && error.expose
        ? error.message
        : statusCode >= 500
          ? 'Internal Server Error'
          : fastifyError.message ?? 'Request failed'

    reply.status(statusCode).send({
      statusCode,
      error: errorName,
      message,
    })
  })

  await app.register(dbPlugin, { prisma: options.prisma })
  await app.register(loggingPlugin)
  await app.register(authPlugin)
  await app.register(healthRoutes, { executionConfigState })
  await app.register(userRoutes)
  await app.register(courseRoutes)
  await app.register(gradeRoutes)
  await app.register(progressRoutes)
  await app.register(executeRoutes, { executionConfigState })

  return app
}
