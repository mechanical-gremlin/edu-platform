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

test('POST /execute returns actionable config error when Judge0 key is missing', { concurrency: false }, async () => {
  const previousUrl = process.env.JUDGE0_API_URL
  const previousKey = process.env.JUDGE0_API_KEY
  process.env.JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com'
  delete process.env.JUDGE0_API_KEY

  const app = await buildApp({ prisma: prismaStub })
  try {
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
  } finally {
    await app.close()
    process.env.JUDGE0_API_URL = previousUrl
    process.env.JUDGE0_API_KEY = previousKey
  }
})

test('POST /execute calls RapidAPI Judge0 with auth headers when key is set', { concurrency: false }, async () => {
  const previousUrl = process.env.JUDGE0_API_URL
  const previousKey = process.env.JUDGE0_API_KEY
  process.env.JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com'
  process.env.JUDGE0_API_KEY = 'test-key'

  const originalFetch = globalThis.fetch
  let capturedHeaders: Record<string, string> = {}
  globalThis.fetch = async (input, init) => {
    capturedHeaders = Object.fromEntries(new Headers(init?.headers as HeadersInit).entries())
    const url = String(input)
    if (url.includes('wait=false')) {
      return new Response(
        JSON.stringify({
          token: 'tok-1',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response(
      JSON.stringify({
        stdout: 'Hello\n',
        stderr: null,
        compile_output: null,
        status: { id: 3, description: 'Accepted' },
        time: '0.01',
        memory: 1000,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const app = await buildApp({ prisma: prismaStub })
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/execute',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        language: 'javascript',
        code: 'console.log("hello")',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.equal(capturedHeaders['x-rapidapi-key'], 'test-key')
    assert.equal(capturedHeaders['x-rapidapi-host'], 'judge0-ce.p.rapidapi.com')
  } finally {
    await app.close()
    globalThis.fetch = originalFetch
    process.env.JUDGE0_API_URL = previousUrl
    process.env.JUDGE0_API_KEY = previousKey
  }
})

test('POST /execute calls self-hosted Judge0 without RapidAPI headers', { concurrency: false }, async () => {
  const previousUrl = process.env.JUDGE0_API_URL
  const previousKey = process.env.JUDGE0_API_KEY
  process.env.JUDGE0_API_URL = 'https://judge0.school.internal'
  delete process.env.JUDGE0_API_KEY

  const originalFetch = globalThis.fetch
  let capturedHeaders: Record<string, string> = {}
  globalThis.fetch = async (input, init) => {
    capturedHeaders = Object.fromEntries(new Headers(init?.headers as HeadersInit).entries())
    const url = String(input)
    if (url.includes('wait=false')) {
      return new Response(
        JSON.stringify({
          token: 'tok-2',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response(
      JSON.stringify({
        stdout: 'Hi\n',
        stderr: null,
        compile_output: null,
        status: { id: 3, description: 'Accepted' },
        time: '0.02',
        memory: 1200,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const app = await buildApp({ prisma: prismaStub })
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/execute',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        language: 'python',
        code: 'print(\"hi\")',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.equal(capturedHeaders['x-rapidapi-key'], undefined)
    assert.equal(capturedHeaders['x-rapidapi-host'], undefined)
  } finally {
    await app.close()
    globalThis.fetch = originalFetch
    process.env.JUDGE0_API_URL = previousUrl
    process.env.JUDGE0_API_KEY = previousKey
  }
})

test('POST /execute returns config error for invalid Judge0 URL', { concurrency: false }, async () => {
  const previousUrl = process.env.JUDGE0_API_URL
  const previousKey = process.env.JUDGE0_API_KEY
  process.env.JUDGE0_API_URL = 'not-a-url'
  delete process.env.JUDGE0_API_KEY

  const app = await buildApp({ prisma: prismaStub })
  try {
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
      message: 'Code execution is not configured. JUDGE0_API_URL must be a valid URL.',
    })
  } finally {
    await app.close()
    process.env.JUDGE0_API_URL = previousUrl
    process.env.JUDGE0_API_KEY = previousKey
  }
})
