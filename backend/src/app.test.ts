import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from './app.js'

const EXECUTION_ENV_KEYS = [
  'NODE_ENV',
  'JUDGE0_BASE_URL',
  'JUDGE0_API_KEY',
  'EXEC_TIMEOUT_MS',
  'EXEC_MAX_SOURCE_KB',
  'EXEC_MAX_STDIN_KB',
  'EXEC_MAX_OUTPUT_KB',
] as const

const withExecutionEnv = (overrides: Partial<Record<(typeof EXECUTION_ENV_KEYS)[number], string | undefined>>) => {
  const previousValues = Object.fromEntries(EXECUTION_ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
    (typeof EXECUTION_ENV_KEYS)[number],
    string | undefined
  >

  process.env.EXEC_TIMEOUT_MS = '12000'
  process.env.EXEC_MAX_SOURCE_KB = '64'
  process.env.EXEC_MAX_STDIN_KB = '8'
  process.env.EXEC_MAX_OUTPUT_KB = '32'
  process.env.JUDGE0_BASE_URL = 'https://judge0.school.internal'
  process.env.NODE_ENV = 'test'
  delete process.env.JUDGE0_API_KEY

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return () => {
    for (const key of EXECUTION_ENV_KEYS) {
      const previousValue = previousValues[key]
      if (previousValue === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = previousValue
      }
    }
  }
}

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
  const restoreEnv = withExecutionEnv({})
  const app = await buildApp({ prisma: prismaStub })
  try {
    const response = await app.inject({ method: 'GET', url: '/health' })
    const body = response.json() as {
      status: string
      execution: { configured: boolean; upstream: string; errors: string[] }
    }

    assert.equal(response.statusCode, 200)
    assert.equal(body.status, 'ok')
    assert.equal(body.execution.configured, true)
    assert.deepEqual(body.execution.errors, [])
    assert.ok(['reachable', 'unreachable'].includes(body.execution.upstream))
  } finally {
    await app.close()
    restoreEnv()
  }
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

test('buildApp fails fast in production when execution config is missing', async () => {
  const restoreEnv = withExecutionEnv({
    NODE_ENV: 'production',
    JUDGE0_BASE_URL: undefined,
    JUDGE0_API_KEY: undefined,
  })

  try {
    await assert.rejects(
      () => buildApp({ prisma: prismaStub }),
      /Invalid execution configuration:[\s\S]*JUDGE0_BASE_URL is required[\s\S]*JUDGE0_API_KEY is required when NODE_ENV=production/,
    )
  } finally {
    restoreEnv()
  }
})

test('POST /execute returns actionable config error when execution env is missing', { concurrency: false }, async () => {
  const restoreEnv = withExecutionEnv({ JUDGE0_BASE_URL: undefined })

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
      message: 'Code execution is not configured. JUDGE0_BASE_URL is required',
    })
  } finally {
    await app.close()
    restoreEnv()
  }
})

test('POST /execute calls RapidAPI Judge0 with auth headers when key is set', { concurrency: false }, async () => {
  const restoreEnv = withExecutionEnv({ JUDGE0_BASE_URL: 'https://judge0-ce.p.rapidapi.com', JUDGE0_API_KEY: 'test-key' })

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
    restoreEnv()
  }
})

test('POST /execute calls self-hosted Judge0 without RapidAPI headers', { concurrency: false }, async () => {
  const restoreEnv = withExecutionEnv({ JUDGE0_BASE_URL: 'https://judge0.school.internal', JUDGE0_API_KEY: undefined })

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
    restoreEnv()
  }
})

test('POST /execute returns config error for invalid Judge0 URL', { concurrency: false }, async () => {
  const restoreEnv = withExecutionEnv({ JUDGE0_BASE_URL: 'not-a-url', JUDGE0_API_KEY: undefined })

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
      message: 'Code execution is not configured. JUDGE0_BASE_URL must be a valid URL',
    })
  } finally {
    await app.close()
    restoreEnv()
  }
})

test('POST /execute rejects code that exceeds configured source limit', { concurrency: false }, async () => {
  const restoreEnv = withExecutionEnv({ EXEC_MAX_SOURCE_KB: '1' })
  const app = await buildApp({ prisma: prismaStub })
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/execute',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        language: 'javascript',
        code: 'a'.repeat(1025),
      },
    })

    assert.equal(response.statusCode, 400)
    assert.deepEqual(response.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'Source code exceeds EXEC_MAX_SOURCE_KB (1 KB).',
    })
  } finally {
    await app.close()
    restoreEnv()
  }
})

test('POST /execute truncates oversized output using configured output limit', { concurrency: false }, async () => {
  const restoreEnv = withExecutionEnv({ EXEC_MAX_OUTPUT_KB: '1' })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = String(input)
    if (url.includes('wait=false')) {
      return new Response(JSON.stringify({ token: 'tok-3' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        stdout: 'x'.repeat(1500),
        stderr: null,
        compile_output: null,
        status: { id: 3, description: 'Accepted' },
        time: '0.01',
        memory: 1024,
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
    const body = response.json() as { stdout: string | null }
    assert.ok(body.stdout?.endsWith('\n[output truncated]'))
  } finally {
    await app.close()
    globalThis.fetch = originalFetch
    restoreEnv()
  }
})

test('student resubmission preserves manual grade while refreshing autograder details', { concurrency: false }, async () => {
  const restoreEnv = withExecutionEnv({ JUDGE0_BASE_URL: 'https://judge0.school.internal', JUDGE0_API_KEY: undefined })

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
    restoreEnv()
  }
})

test('student resubmission keeps commentless manual override unchanged', { concurrency: false }, async () => {
  const restoreEnv = withExecutionEnv({ JUDGE0_BASE_URL: 'https://judge0.school.internal', JUDGE0_API_KEY: undefined })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = String(input)
    if (url.includes('wait=false')) {
      return new Response(JSON.stringify({ token: 'tok-override-empty-comment' }), {
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
        id: 'sub-1b',
        studentId: 's-1',
        activityId: 'a-2',
        status: 'submitted',
        submittedAt: new Date('2026-09-12T00:00:00.000Z'),
      }),
    },
    grade: {
      findUnique: async () => ({
        id: 'grade-1b',
        gradingSource: 'manual',
        comment: null,
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        capturedGradeUpdate = data
        return {
          id: 'grade-1b',
          ...data,
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
    restoreEnv()
  }
})

test('student submission creates an autograded grade when no manual override exists', { concurrency: false }, async () => {
  const restoreEnv = withExecutionEnv({ JUDGE0_BASE_URL: 'https://judge0.school.internal', JUDGE0_API_KEY: undefined })

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
    restoreEnv()
  }
})
