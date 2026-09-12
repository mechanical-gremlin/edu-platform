import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from './app.js'

const prismaStub = {
  user: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      if (where.id === 't-1') {
        return {
          id: 't-1',
          name: 'Ms. Ramirez',
          email: 'teacher@example.edu',
          role: 'teacher',
        }
      }

      return null
    },
  },
  $disconnect: async () => undefined,
} as any

test('GET /health returns ok', async () => {
  const app = await buildApp({ prisma: prismaStub })
  const response = await app.inject({ method: 'GET', url: '/health' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { status: 'ok' })

  await app.close()
})

test('GET / returns service metadata', async () => {
  const app = await buildApp({ prisma: prismaStub })
  const response = await app.inject({ method: 'GET', url: '/' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    service: 'edu-platform-api',
    status: 'ok',
    health: '/health',
  })

  await app.close()
})

test('GET /me requires authentication header', async () => {
  const app = await buildApp({ prisma: prismaStub })
  const response = await app.inject({ method: 'GET', url: '/me' })

  assert.equal(response.statusCode, 401)
  assert.deepEqual(response.json(), {
    statusCode: 401,
    error: 'Unauthorized',
    message: 'Authentication required',
  })

  await app.close()
})

test('GET /me returns the authenticated user', async () => {
  const app = await buildApp({ prisma: prismaStub })
  const response = await app.inject({
    method: 'GET',
    url: '/me',
    headers: { 'x-user-id': 't-1' },
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    id: 't-1',
    name: 'Ms. Ramirez',
    email: 'teacher@example.edu',
    role: 'teacher',
  })

  await app.close()
})

test('POST /execute returns actionable config error when Judge0 key is missing', async () => {
  const app = await buildApp({ prisma: prismaStub })
  const response = await app.inject({
    method: 'POST',
    url: '/execute',
    headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
    payload: {
      language: 'javascript',
      code: 'console.log("hello")',
    },
  })

  assert.equal(response.statusCode, 503)
  assert.deepEqual(response.json(), {
    statusCode: 503,
    error: 'Service Unavailable',
    message: 'Code execution is not configured. Set JUDGE0_API_KEY in backend environment variables.',
  })

  await app.close()
})
