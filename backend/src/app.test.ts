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

test('student resubmission preserves manual grade while refreshing autograder details', { concurrency: false }, async () => {
  const previousUrl = process.env.JUDGE0_API_URL
  const previousKey = process.env.JUDGE0_API_KEY
  process.env.JUDGE0_API_URL = 'https://judge0.school.internal'
  delete process.env.JUDGE0_API_KEY

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = String(input)
    if (url.includes('wait=false')) {
      return new Response(JSON.stringify({ token: 'tok-override' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        stdout: 'Alex: 1500\n',
        stderr: null,
        compile_output: null,
        status: { id: 3, description: 'Accepted' },
        time: '0.01',
        memory: 1024,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let capturedGradeUpdate: Record<string, unknown> | null = null
  const submissionPrismaStub = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === 's-1') {
          return {
            id: 's-1',
            name: 'Avery Chen',
            email: 'student@example.edu',
            role: 'student',
          }
        }

        return null
      },
    },
    activity: {
      findUnique: async () => ({
        id: 'a-2',
        type: 'coding',
        language: 'javascript',
        visible: true,
        pointsPossible: 20,
        autograderEnabled: true,
        autograderReferenceSolution: 'const playerName = "Alex"; const score = 1500; console.log(`${playerName}: ${score}`);',
        autograderReferenceOutput: 'Alex: 1500',
        autograderCodeMatch: true,
        autograderOutputMatch: true,
        autograderTestCases: [],
        lesson: { unit: { courseId: 'c-1' } },
      }),
    },
    enrollment: {
      findUnique: async ({ where }: { where: { userId_courseId: { userId: string; courseId: string } } }) => {
        if (where.userId_courseId.userId === 's-1' && where.userId_courseId.courseId === 'c-1') {
          return { role: 'student' }
        }
        return null
      },
    },
    submission: {
      upsert: async () => ({
        id: 'sub-1',
        studentId: 's-1',
        activityId: 'a-2',
        status: 'submitted',
        submittedAt: new Date('2026-09-12T00:00:00.000Z'),
      }),
    },
    grade: {
      findUnique: async () => ({
        id: 'grade-1',
        gradingSource: 'manual',
        comment: 'Teacher feedback stays attached to the manual override.',
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        capturedGradeUpdate = data
        return {
          id: 'grade-1',
          ...data,
        }
      },
    },
    enrollmentRole: undefined,
    $disconnect: async () => undefined,
  } as any

  const app = await buildApp({ prisma: submissionPrismaStub })
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/activities/a-2/submissions',
      headers: { 'x-user-id': 's-1', 'content-type': 'application/json' },
      payload: {
        content: {
          responseText: 'const name = "Alex";\nconst total = 1500;\nconsole.log(name + ": " + total);',
        },
      },
    })

    assert.equal(response.statusCode, 201)
    assert.ok(capturedGradeUpdate)
    const updatedGrade = capturedGradeUpdate as { autograderResult: { score?: number } }
    assert.deepEqual(Object.keys(updatedGrade), ['autograderResult'])
    assert.equal(updatedGrade.autograderResult.score, 50)
  } finally {
    await app.close()
    globalThis.fetch = originalFetch
    process.env.JUDGE0_API_URL = previousUrl
    process.env.JUDGE0_API_KEY = previousKey
  }
})

test('student submission creates an autograded grade when no manual override exists', { concurrency: false }, async () => {
  const previousUrl = process.env.JUDGE0_API_URL
  const previousKey = process.env.JUDGE0_API_KEY
  process.env.JUDGE0_API_URL = 'https://judge0.school.internal'
  delete process.env.JUDGE0_API_KEY

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = String(input)
    if (url.includes('wait=false')) {
      return new Response(JSON.stringify({ token: 'tok-auto' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        stdout: 'Alex: 1500\n',
        stderr: null,
        compile_output: null,
        status: { id: 3, description: 'Accepted' },
        time: '0.01',
        memory: 1024,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let capturedGradeUpsert: Record<string, unknown> | null = null
  const submissionPrismaStub = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === 's-1') {
          return {
            id: 's-1',
            name: 'Avery Chen',
            email: 'student@example.edu',
            role: 'student',
          }
        }

        return null
      },
    },
    activity: {
      findUnique: async () => ({
        id: 'a-2',
        type: 'coding',
        language: 'javascript',
        visible: true,
        pointsPossible: 20,
        autograderEnabled: true,
        autograderReferenceSolution: 'const playerName = "Alex"; const score = 1500; console.log(`${playerName}: ${score}`);',
        autograderReferenceOutput: 'Alex: 1500',
        autograderCodeMatch: true,
        autograderOutputMatch: true,
        autograderTestCases: [],
        lesson: { unit: { courseId: 'c-1' } },
      }),
    },
    enrollment: {
      findUnique: async ({ where }: { where: { userId_courseId: { userId: string; courseId: string } } }) => {
        if (where.userId_courseId.userId === 's-1' && where.userId_courseId.courseId === 'c-1') {
          return { role: 'student' }
        }
        return null
      },
    },
    submission: {
      upsert: async () => ({
        id: 'sub-2',
        studentId: 's-1',
        activityId: 'a-2',
        status: 'submitted',
        submittedAt: new Date('2026-09-12T00:00:00.000Z'),
      }),
    },
    grade: {
      findUnique: async () => null,
      upsert: async ({ update }: { update: Record<string, unknown> }) => {
        capturedGradeUpsert = update
        return {
          id: 'grade-2',
          ...update,
        }
      },
    },
    $disconnect: async () => undefined,
  } as any

  const app = await buildApp({ prisma: submissionPrismaStub })
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/activities/a-2/submissions',
      headers: { 'x-user-id': 's-1', 'content-type': 'application/json' },
      payload: {
        content: {
          responseText: 'const playerName = "Alex";\nconst score = 1500;\nconsole.log(`${playerName}: ${score}`);',
        },
      },
    })

    assert.equal(response.statusCode, 201)
    assert.ok(capturedGradeUpsert)
    const createdGrade = capturedGradeUpsert as {
      pointsEarned: number
      gradingSource: string
      autograderResult: { score?: number }
    }
    assert.equal(createdGrade.pointsEarned, 20)
    assert.equal(createdGrade.gradingSource, 'autograder')
    assert.equal(createdGrade.autograderResult.score, 100)
  } finally {
    await app.close()
    globalThis.fetch = originalFetch
    process.env.JUDGE0_API_URL = previousUrl
    process.env.JUDGE0_API_KEY = previousKey
  }
})
