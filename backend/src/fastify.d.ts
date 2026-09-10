import type { PrismaClient, UserRole } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }

  interface FastifyRequest {
    user: {
      id: string
      name: string
      email: string
      role: UserRole
    } | null
  }
}
