import { STATUS_CODES } from 'node:http'
import type { FastifyRequest } from 'fastify'
import type { UserRole } from '@prisma/client'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly error = STATUS_CODES[statusCode] ?? 'Error',
    public readonly expose = statusCode < 500,
  ) {
    super(message)
  }
}

export const iso = (value: Date | null | undefined) => value?.toISOString() ?? null

export const requireUser = (request: FastifyRequest) => {
  if (!request.user) {
    throw new AppError(401, 'Authentication required')
  }

  return request.user
}

export const requireRole = (request: FastifyRequest, role: UserRole) => {
  const user = requireUser(request)

  if (user.role !== role) {
    throw new AppError(403, `Requires ${role} role`)
  }

  return user
}
