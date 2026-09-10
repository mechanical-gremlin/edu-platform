import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

const loggingPluginImpl: FastifyPluginAsync = async (app) => {
  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
      },
      'request completed',
    )
  })
}

export const loggingPlugin = fp(loggingPluginImpl, { name: 'logging-plugin' })
