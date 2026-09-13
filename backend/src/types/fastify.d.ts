import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    executeStartedAt: number | null
  }
}
