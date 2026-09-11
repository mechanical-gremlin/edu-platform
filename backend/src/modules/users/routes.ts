import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireRole, requireUser } from '../../lib.js'

const meResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.enum(['teacher', 'student']),
})

const userListSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    role: z.enum(['teacher', 'student']),
  }),
)

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/me',
    {
      schema: {
        response: {
          200: meResponseSchema,
        },
      },
    },
    async (request) => {
      const user = requireUser(request)
      return meResponseSchema.parse(user)
    },
  )

  app.get(
    '/users',
    {
      schema: {
        response: {
          200: userListSchema,
        },
      },
    },
    async (request) => {
      requireRole(request, 'teacher')
      const users = await app.prisma.user.findMany({
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, email: true, role: true },
      })
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as 'teacher' | 'student',
      }))
    },
  )
}
