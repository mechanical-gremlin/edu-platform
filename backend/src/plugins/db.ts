import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'

interface DbPluginOptions {
  prisma?: PrismaClient
}

const dbPluginImpl: FastifyPluginAsync<DbPluginOptions> = async (app, options) => {
  const prisma = options.prisma ?? new PrismaClient()

  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

export const dbPlugin = fp(dbPluginImpl, { name: 'db-plugin' })
