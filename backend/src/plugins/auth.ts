import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { AppError } from '../lib.js'

const authPluginImpl: FastifyPluginAsync = async (app) => {
  app.decorateRequest('user', null)

  app.addHook('onRequest', async (request) => {
    const userIdHeader = request.headers['x-user-id']
    const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader

    if (!userId) {
      request.user = null
      return
    }

    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) {
      throw new AppError(401, 'Unknown user')
    }

    request.user = user
  })
}

export const authPlugin = fp(authPluginImpl, { name: 'auth-plugin' })
