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

interface BuildAppOptions {
  prisma?: PrismaClient
}

export const buildApp = async (options: BuildAppOptions = {}) => {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  await app.register(cors, { origin: true })

  app.addHook('onSend', (_request, reply, _payload, done) => {
    reply.header('Cross-Origin-Opener-Policy', 'same-origin')
    done()
  })

  app.setErrorHandler((error, _request, reply) => {
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
  await app.register(healthRoutes)
  await app.register(userRoutes)
  await app.register(courseRoutes)
  await app.register(gradeRoutes)
  await app.register(progressRoutes)
  await app.register(executeRoutes)

  return app
}
