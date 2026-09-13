import test from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'
import { buildApp } from '../../app.js'

const buildCoursePrismaStub = () => {
  const unitPositionUpdates: Array<{ id: string; position?: number; data: Record<string, unknown> }> = []
  const lessonPositionUpdates: Array<{ id: string; position?: number; data: Record<string, unknown> }> = []
  const activityUpdates: Array<{ id: string; position?: number; data: Record<string, unknown> }> = []
  const coursePositionUpdates: Array<{ id: string; position?: number; data: Record<string, unknown> }> = []
  let courseUpdateData: Record<string, unknown> | null = null
  let unitUpdateData: Record<string, unknown> | null = null
  let activityPatchData: Record<string, unknown> | null = null
  let activityCreateData: Record<string, unknown> | null = null
  let courseVisibilityUpdate: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null
  let lessonVisibilityUpdate: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null
  let lessonRecordUpdate: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null
  let lessonBulkUpdate: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null
  let unitVisibilityUpdate: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null
  let unitBulkUpdate: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null
  let deletedCourseId: string | null = null
  let deletedUnitId: string | null = null
  let deletedLessonId: string | null = null
  let deletedActivityId: string | null = null
  const stub: any = {
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
    enrollment: {
      aggregate: async () => ({
        _max: { position: 1 },
      }),
      findMany: async () => [
        { id: 'en-c-1', courseId: 'c-1', position: 0 },
        { id: 'en-c-2', courseId: 'c-2', position: 1 },
      ],
      findUnique: async ({ where }: { where: { userId_courseId: { userId: string; courseId: string } } }) => {
        if (where.userId_courseId.userId === 't-1' && ['c-1', 'c-2'].includes(where.userId_courseId.courseId)) {
          return { role: 'teacher' }
        }

        return null
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        coursePositionUpdates.push({
          id: where.id,
          position: data.position as number,
          data,
        })
        return { id: where.id }
      },
      course: {
        findMany: async () => [
          {
            id: 'c-1',
            title: 'Course 1',
            code: 'COURSE-1',
            description: 'Course description',
            enrollments: [{ user: { name: 'Ms. Ramirez' } }],
          },
        ],
        findUnique: async ({ where }: { where: { id?: string; code?: string } }) => {
          if (where.code) {
            return null
          }
          if (where.id !== 'c-1') {
            return null
          }
          return {
            id: 'c-1',
            title: 'Course 1',
            code: 'COURSE-1',
            description: 'Course description',
            enrollments: [
              {
                userId: 't-1',
                role: 'teacher',
                user: { id: 't-1', name: 'Ms. Ramirez', role: 'teacher' },
              },
            ],
            units: [
              {
                id: 'u-1',
                title: 'Unit 1',
                description: 'Original unit',
                visible: true,
                lessons: [
                  {
                    id: 'l-1',
                    title: 'Lesson 1',
                    description: 'Original lesson',
                    visible: true,
                    activities: [
                      {
                        id: 'a-1',
                        title: 'Assignment 1',
                        type: 'coding',
                        description: 'Assignment summary',
                        directions: null,
                        language: 'python',
                        languageLocked: false,
                        starterCode: 'print("hello")',
                        starterFiles: {
                          files: [{ path: 'main.py', content: 'print("hello")', language: 'python' }],
                          entrypoint: 'main.py',
                        },
                        studentFileTreeEnabled: false,
                        studentEntrypointSelectionEnabled: false,
                        expectedOutput: null,
                        autograderEnabled: false,
                        resourceUrl: null,
                        visible: true,
                        dueAt: null,
                        pointsPossible: 10,
                        lessonId: 'l-1',
                      },
                    ],
                  },
                ],
              },
            ],
          }
        },
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'c-new',
          title: String(data.title ?? 'Course'),
          description: (data.description as string | null | undefined) ?? null,
        }),
      },
    },
    course: {
      aggregate: async () => ({
        _max: { position: 1 },
      }),
      findMany: async () => [
        {
          id: 'c-1',
          title: 'Course 1',
          code: 'COURSE-1',
          description: 'Course description',
          visible: true,
          position: 0,
          enrollments: [{ user: { name: 'Ms. Ramirez' } }],
        },
        {
          id: 'c-2',
          title: 'Course 2',
          code: 'COURSE-2',
          description: 'Second course',
          visible: true,
          position: 1,
          enrollments: [{ user: { name: 'Ms. Ramirez' } }],
        },
      ],
      findUnique: async ({ where }: { where: { id?: string; code?: string } }) => {
        if (where.code === 'COURSE-9') {
          return { id: 'c-9' }
        }
        if (where.code) {
          return null
        }
        if (where.id !== 'c-1' && where.id !== 'c-2') {
          return null
        }
        return {
          id: where.id,
          title: where.id === 'c-2' ? 'Course 2' : 'Course 1',
          code: where.id === 'c-2' ? 'COURSE-2' : 'COURSE-1',
          description: where.id === 'c-2' ? 'Second course' : 'Course description',
          visible: true,
          enrollments: [
            {
              userId: 't-1',
              role: 'teacher',
              user: { id: 't-1', name: 'Ms. Ramirez', role: 'teacher' },
            },
          ],
          units: where.id === 'c-2'
            ? []
            : [
                {
                  id: 'u-1',
                  title: 'Unit 1',
                  description: 'Original unit',
                  visible: true,
                  lessons: [
                    {
                      id: 'l-1',
                      title: 'Lesson 1',
                      description: 'Original lesson',
                      visible: true,
                      activities: [
                        {
                          id: 'a-1',
                          title: 'Assignment 1',
                          type: 'coding',
                          description: 'Assignment summary',
                          directions: null,
                          language: 'python',
                          languageLocked: false,
                          starterCode: 'print("hello")',
                          starterFiles: {
                            files: [{ path: 'main.py', content: 'print("hello")', language: 'python' }],
                            entrypoint: 'main.py',
                          },
                          studentFileTreeEnabled: false,
                          studentEntrypointSelectionEnabled: false,
                          expectedOutput: null,
                          autograderEnabled: false,
                          autograderReferenceSolution: null,
                          autograderReferenceOutput: null,
                          autograderCodeMatch: false,
                          autograderOutputMatch: false,
                          autograderTestCases: [],
                          resourceUrl: null,
                          visible: true,
                          dueAt: null,
                          pointsPossible: 10,
                          lessonId: 'l-1',
                        },
                      ],
                    },
                  ],
                },
              ],
        }
      },
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'c-new',
        title: String(data.title ?? 'Course'),
        code: String(data.code ?? 'COURSE-NEW'),
        description: (data.description as string | null | undefined) ?? null,
        visible: Boolean(data.visible ?? true),
      }),
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        if ('position' in data) {
          coursePositionUpdates.push({
            id: where.id,
            position: data.position as number,
            data,
          })
          return { id: where.id }
        }
        if ('visible' in data) {
          courseVisibilityUpdate = { where, data }
        }
        courseUpdateData = data
        return {
          id: where.id,
          title: String(data.title ?? 'Course 1'),
          code: String(data.code ?? 'COURSE-1'),
          description: (data.description as string | null | undefined) ?? null,
          visible: Boolean(data.visible ?? true),
        }
      },
      delete: async ({ where }: { where: { id: string } }) => {
        deletedCourseId = where.id
        return { id: where.id }
      },
    },
    unit: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === 'u-1') {
          return { id: 'u-1', title: 'Unit 1', description: 'Original unit', courseId: 'c-1', visible: true }
        }

        if (where.id === 'u-2') {
          return { id: 'u-2', title: 'Unit 2', description: 'Second unit', courseId: 'c-1', visible: true }
        }

        return null
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        if ('position' in data) {
          unitPositionUpdates.push({
            id: where.id,
            position: data.position as number,
            data,
          })
          return { id: where.id }
        }
        if ('visible' in data) {
          unitVisibilityUpdate = { where, data }
        }
        unitUpdateData = data
        return {
          id: where.id,
          title: String(data.title ?? 'Unit 1'),
          description: (data.description as string | null | undefined) ?? null,
        }
      },
      findMany: async () => [
        { id: 'u-1', position: 0 },
        { id: 'u-2', position: 1 },
      ],
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        unitBulkUpdate = { where, data }
        return { count: 2 }
      },
      delete: async ({ where }: { where: { id: string } }) => {
        deletedUnitId = where.id
        return { id: where.id }
      },
    },
    lesson: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === 'l-1') {
          return {
            id: 'l-1',
            title: 'Lesson 1',
            description: 'Original lesson',
            unitId: 'u-1',
            visible: true,
            unit: { courseId: 'c-1' },
            activities: [
              { position: 0 },
              { position: 1 },
            ],
          }
        }

        if (where.id === 'l-2') {
          return {
            id: 'l-2',
            title: 'Lesson 2',
            description: 'Second lesson',
            unitId: 'u-1',
            visible: true,
            unit: { courseId: 'c-1' },
            activities: [],
          }
        }

        if (where.id === 'l-3') {
          return {
            id: 'l-3',
            title: 'Lesson 3',
            description: 'Third lesson',
            unitId: 'u-1',
            visible: true,
            unit: { courseId: 'c-1' },
            activities: [{ position: 3 }],
          }
        }

        return null
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        if ('position' in data) {
          lessonPositionUpdates.push({
            id: where.id,
            position: data.position as number,
            data,
          })
          return { id: where.id }
        }
        lessonRecordUpdate = { where, data }
        return {
          id: where.id,
          title: String(data.title ?? 'Lesson 1'),
          description: (data.description as string | null | undefined) ?? null,
        }
      },
      findMany: async () => [
        { id: 'l-1', position: 0 },
        { id: 'l-2', position: 1 },
      ],
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        lessonBulkUpdate = { where, data }
        return { count: 2 }
      },
      delete: async ({ where }: { where: { id: string } }) => {
        deletedLessonId = where.id
        return { id: where.id }
      },
    },
    activity: {
      aggregate: async () => ({
        _max: { position: 1 },
      }),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        activityCreateData = data
        return {
          id: 'a-new',
          lessonId: String(data.lessonId),
          title: String(data.title),
          type: String(data.type),
          description: String(data.description),
          directions: (data.directions as string | null | undefined) ?? null,
          language: (data.language as string | null | undefined) ?? null,
          languageLocked: Boolean(data.languageLocked),
          studentFileTreeEnabled: Boolean(data.studentFileTreeEnabled),
          studentEntrypointSelectionEnabled: Boolean(data.studentEntrypointSelectionEnabled),
          starterCode: (data.starterCode as string | null | undefined) ?? null,
          starterFiles: data.starterFiles ?? null,
          expectedOutput: (data.expectedOutput as string | null | undefined) ?? null,
          autograderEnabled: Boolean(data.autograderEnabled),
          autograderReferenceSolution: (data.autograderReferenceSolution as string | null | undefined) ?? null,
          autograderReferenceOutput: (data.autograderReferenceOutput as string | null | undefined) ?? null,
          autograderCodeMatch: Boolean(data.autograderCodeMatch),
          autograderOutputMatch: Boolean(data.autograderOutputMatch),
          autograderTestCases: data.autograderTestCases ?? [],
          resourceUrl: (data.resourceUrl as string | null | undefined) ?? null,
          visible: Boolean(data.visible ?? true),
          dueAt: (data.dueAt as Date | null | undefined) ?? null,
          pointsPossible: Number(data.pointsPossible ?? 10),
          position: Number(data.position ?? 2),
        }
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === 'a-1') {
          return {
            id: 'a-1',
            title: 'Assignment 1',
            type: 'coding',
            description: 'Assignment summary',
            directions: null,
            language: 'python',
            languageLocked: false,
            starterCode: 'print("hello")',
            starterFiles: null,
            studentFileTreeEnabled: true,
            studentEntrypointSelectionEnabled: true,
            expectedOutput: null,
            autograderEnabled: false,
            autograderReferenceSolution: null,
            autograderReferenceOutput: null,
            autograderCodeMatch: false,
            autograderOutputMatch: false,
            autograderTestCases: null,
            dueAt: null,
            pointsPossible: 10,
            resourceUrl: null,
            visible: true,
            lessonId: 'l-1',
            lesson: { unit: { courseId: 'c-1' } },
          }
        }

        if (where.id === 'a-2') {
          return {
            id: 'a-2',
            title: 'Assignment 2',
            type: 'coding',
            description: 'Assignment summary',
            directions: null,
            language: 'python',
            languageLocked: false,
            starterCode: 'print("hello")',
            starterFiles: null,
            studentFileTreeEnabled: true,
            studentEntrypointSelectionEnabled: true,
            expectedOutput: null,
            autograderEnabled: false,
            autograderReferenceSolution: null,
            autograderReferenceOutput: null,
            autograderCodeMatch: false,
            autograderOutputMatch: false,
            autograderTestCases: null,
            dueAt: null,
            pointsPossible: 20,
            resourceUrl: null,
            visible: true,
            lessonId: 'l-1',
            lesson: { unit: { courseId: 'c-1' } },
          }
        }

        return null
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        if ('position' in data) {
          activityUpdates.push({
            id: where.id,
            position: data.position as number,
            data,
          })
          return { id: where.id }
        }

        activityPatchData = data
        return {
          id: where.id,
          title: String(data.title ?? 'Assignment 1'),
          type: String(data.type ?? 'coding'),
          description: String(data.description ?? 'Assignment summary'),
          directions: (data.directions as string | null | undefined) ?? null,
          language: (data.language as string | null | undefined) ?? null,
          languageLocked: Boolean(data.languageLocked),
          studentFileTreeEnabled: Boolean(data.studentFileTreeEnabled ?? true),
          studentEntrypointSelectionEnabled: Boolean(data.studentEntrypointSelectionEnabled ?? true),
          starterCode: (data.starterCode as string | null | undefined) ?? null,
          starterFiles: data.starterFiles ?? null,
          expectedOutput: (data.expectedOutput as string | null | undefined) ?? null,
          autograderEnabled: Boolean(data.autograderEnabled),
          autograderReferenceSolution: (data.autograderReferenceSolution as string | null | undefined) ?? null,
          autograderReferenceOutput: (data.autograderReferenceOutput as string | null | undefined) ?? null,
          autograderCodeMatch: Boolean(data.autograderCodeMatch),
          autograderOutputMatch: Boolean(data.autograderOutputMatch),
          autograderTestCases: data.autograderTestCases ?? [],
          resourceUrl: (data.resourceUrl as string | null | undefined) ?? null,
          visible: Boolean(data.visible ?? true),
          dueAt: (data.dueAt as Date | null | undefined) ?? null,
          pointsPossible: Number(data.pointsPossible ?? 10),
        }
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        lessonVisibilityUpdate = { where, data }
        return { count: 2 }
      },
      findMany: async ({
        where,
        orderBy,
        take,
        select,
      }: {
        where?: { lessonId?: string; id?: { not?: string } }
        orderBy?: { position?: 'asc' | 'desc' }
        take?: number
        select?: { id?: boolean; position?: boolean }
      } = {}) => {
        if (where?.lessonId === 'l-2') {
          return []
        }
        if (where?.lessonId === 'l-3') {
          return [{ id: 'a-9', position: 3 }]
        }

        const rows: Array<{ id: string; position: number }> = [
          { id: 'a-1', position: 0 },
          { id: 'a-2', position: 1 },
        ]
        const filteredRows = where?.id?.not ? rows.filter((row) => row.id !== where.id?.not) : rows

        if (orderBy?.position === 'desc') {
          filteredRows.reverse()
        }

        const selectedRows = filteredRows.map((row) => {
          if (select?.id && !select?.position) {
            return { id: row.id }
          }
          if (!select?.id && select?.position) {
            return { position: row.position }
          }
          return row
        })

        if (typeof take === 'number') {
          return selectedRows.slice(0, take)
        }

        return selectedRows
      },
      delete: async ({ where }: { where: { id: string } }) => {
        deletedActivityId = where.id
        return { id: where.id }
      },
    },
    $executeRaw: async () => 1,
    $transaction: async (callback: (tx: any) => Promise<unknown>) => callback(stub),
    $disconnect: async () => undefined,
  }

  return {
    stub,
    getCourseUpdateData: () => courseUpdateData,
    getCoursePositionUpdates: () => coursePositionUpdates,
    getUnitUpdateData: () => unitUpdateData,
    getUnitPositionUpdates: () => unitPositionUpdates,
    getActivityPatchData: () => activityPatchData,
    getActivityCreateData: () => activityCreateData,
    getCourseVisibilityUpdate: () => courseVisibilityUpdate,
    getLessonVisibilityUpdate: () => lessonVisibilityUpdate,
    getLessonRecordUpdate: () => lessonRecordUpdate,
    getLessonBulkUpdate: () => lessonBulkUpdate,
    getLessonPositionUpdates: () => lessonPositionUpdates,
    getUnitVisibilityUpdate: () => unitVisibilityUpdate,
    getUnitBulkUpdate: () => unitBulkUpdate,
    getActivityUpdates: () => activityUpdates,
    getDeletedCourseId: () => deletedCourseId,
    getDeletedUnitId: () => deletedUnitId,
    getDeletedLessonId: () => deletedLessonId,
    getDeletedActivityId: () => deletedActivityId,
  }
}

test('PATCH /units/:unitId updates unit metadata', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/units/u-1',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        title: 'Updated Unit',
        description: 'Refined summary',
      },
    })

    assert.equal(response.statusCode, 200, response.body)
    assert.deepEqual(response.json(), {
      id: 'u-1',
      title: 'Updated Unit',
      description: 'Refined summary',
    })
    assert.deepEqual(prisma.getUnitUpdateData(), {
      title: 'Updated Unit',
      description: 'Refined summary',
    })
  } finally {
    await app.close()
  }
})

test('PATCH /courses/:courseId updates course metadata', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/courses/c-1',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        title: 'Updated Course',
        code: 'COURSE-42',
        description: 'Revised overview',
      },
    })

    assert.equal(response.statusCode, 200, response.body)
    assert.deepEqual(response.json(), {
      id: 'c-1',
      title: 'Updated Course',
      code: 'COURSE-42',
      description: 'Revised overview',
      visible: true,
    })
    assert.deepEqual(prisma.getCourseUpdateData(), {
      title: 'Updated Course',
      code: 'COURSE-42',
      description: 'Revised overview',
    })
  } finally {
    await app.close()
  }
})

test('PATCH /courses/:courseId rejects duplicate course codes', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/courses/c-1',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        title: 'Updated Course',
        code: 'COURSE-9',
        description: 'Revised overview',
      },
    })

    assert.equal(response.statusCode, 409)
    assert.deepEqual(response.json(), {
      statusCode: 409,
      error: 'Conflict',
      message: 'A course with code "COURSE-9" already exists',
    })
  } finally {
    await app.close()
  }
})

test('PATCH /courses/:courseId/visibility toggles the course and nested hierarchy together', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/courses/c-1/visibility',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        visible: false,
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'c-1', visible: false })
    assert.deepEqual(prisma.getLessonVisibilityUpdate(), {
      where: { lesson: { unit: { courseId: 'c-1' } } },
      data: { visible: false },
    })
    assert.deepEqual(prisma.getLessonBulkUpdate(), {
      where: { unit: { courseId: 'c-1' } },
      data: { visible: false },
    })
    assert.deepEqual(prisma.getUnitBulkUpdate(), {
      where: { courseId: 'c-1' },
      data: { visible: false },
    })
    assert.deepEqual(prisma.getCourseVisibilityUpdate(), {
      where: { id: 'c-1' },
      data: { visible: false },
    })
  } finally {
    await app.close()
  }
})

test('PATCH /courses/:courseId/move swaps teacher course positions', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/courses/c-2/move',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: { direction: 'up' },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'c-2' })
    assert.deepEqual(prisma.getCoursePositionUpdates(), [
      { id: 'en-c-2', position: -1, data: { position: -1 } },
      { id: 'en-c-1', position: 1, data: { position: 1 } },
      { id: 'en-c-2', position: 0, data: { position: 0 } },
    ])
  } finally {
    await app.close()
  }
})

test('DELETE /courses/:courseId deletes the full course tree', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'DELETE',
      url: '/courses/c-1',
      headers: { 'x-user-id': 't-1' },
    })

    assert.equal(response.statusCode, 204, response.body)
    assert.equal(prisma.getDeletedCourseId(), 'c-1')
  } finally {
    await app.close()
  }
})

test('POST /lessons/:lessonId/activities rejects mismatched web starter entrypoint', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/lessons/l-1/activities',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        title: 'Web Starter',
        type: 'coding',
        description: 'Create a starter project workspace',
        language: 'web',
        starterFiles: [
          { path: 'index.html', content: '<h1>Hello</h1>' },
        ],
        entrypoint: 'missing.html',
        pointsPossible: 10,
      },
    })

    assert.equal(response.statusCode, 400)
    assert.deepEqual(response.json(), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'Entrypoint must reference a starter project file.',
    })
  } finally {
    await app.close()
  }
})

test('POST /lessons/:lessonId/activities persists student workspace visibility controls', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/lessons/l-1/activities',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        title: 'Python Workspace',
        type: 'coding',
        description: 'Run a two-file python project',
        language: 'python',
        starterFiles: [
          { path: 'main.py', content: 'import helper\nprint(helper.VALUE)\n' },
          { path: 'helper.py', content: 'VALUE = "ok"\n' },
        ],
        entrypoint: 'main.py',
        studentFileTreeEnabled: false,
        studentEntrypointSelectionEnabled: false,
        pointsPossible: 10,
      },
    })

    assert.equal(response.statusCode, 201)
    assert.equal(response.json().studentFileTreeEnabled, false)
    assert.equal(response.json().studentEntrypointSelectionEnabled, false)
    assert.equal(prisma.getActivityCreateData()?.studentFileTreeEnabled, false)
    assert.equal(prisma.getActivityCreateData()?.studentEntrypointSelectionEnabled, false)
  } finally {
    await app.close()
  }
})

test('PATCH /activities/:activityId updates teacher-editable assignment fields', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/activities/a-1',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        title: 'Updated Assignment',
        type: 'coding',
        description: 'New prompt',
        directions: '<p>Follow the updated steps.</p>',
        language: 'python',
        languageLocked: true,
        starterCode: 'print("updated")',
        starterFiles: [
          { path: 'main.py', content: 'print("updated")', language: 'python' },
          { path: 'helper.py', content: 'VALUE = 42', language: 'python' },
        ],
        entrypoint: 'main.py',
        studentFileTreeEnabled: false,
        studentEntrypointSelectionEnabled: false,
        expectedOutput: 'updated',
        autograderEnabled: true,
        autograderReferenceSolution: 'print("updated")',
        autograderReferenceOutput: 'updated',
        autograderCodeMatch: true,
        autograderOutputMatch: true,
        autograderTestCases: [{ input: '', expectedOutput: 'updated' }],
        dueAt: '2026-09-30T23:59:00.000Z',
        pointsPossible: 25,
        resourceUrl: 'https://example.edu/activity',
        visible: false,
      },
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().title, 'Updated Assignment')
    assert.equal(typeof response.json().studentFileTreeEnabled, 'boolean')
    assert.equal(typeof response.json().studentEntrypointSelectionEnabled, 'boolean')
    assert.equal(response.json().autograderReferenceSolution, 'print("updated")')
    assert.equal(response.json().visible, false)
    assert.deepEqual(prisma.getActivityPatchData(), {
      title: 'Updated Assignment',
      language: 'python',
      languageLocked: true,
      starterCode: 'print("updated")',
      starterFiles: {
        files: [
          { path: 'main.py', content: 'print("updated")', language: 'python' },
          { path: 'helper.py', content: 'VALUE = 42', language: 'python' },
        ],
        entrypoint: 'main.py',
      },
      expectedOutput: 'updated',
      autograderEnabled: true,
      autograderReferenceSolution: 'print("updated")',
      autograderReferenceOutput: 'updated',
      autograderCodeMatch: true,
      autograderOutputMatch: true,
      autograderTestCases: [{ input: '', expectedOutput: 'updated' }],
      description: 'New prompt',
      directions: '<p>Follow the updated steps.</p>',
      dueAt: new Date('2026-09-30T23:59:00.000Z'),
      pointsPossible: 25,
      resourceUrl: 'https://example.edu/activity',
      studentFileTreeEnabled: false,
      studentEntrypointSelectionEnabled: false,
      visible: false,
    })
  } finally {
    await app.close()
  }
})

test('PATCH /activities/:activityId clears nullable assignment fields', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/activities/a-1',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        title: 'Updated Assignment',
        type: 'coding',
        description: 'New prompt',
        directions: null,
        language: 'python',
        languageLocked: false,
        starterCode: null,
        starterFiles: null,
        entrypoint: null,
        studentFileTreeEnabled: true,
        studentEntrypointSelectionEnabled: true,
        expectedOutput: null,
        autograderEnabled: false,
        autograderReferenceSolution: null,
        autograderReferenceOutput: null,
        autograderCodeMatch: false,
        autograderOutputMatch: false,
        autograderTestCases: null,
        dueAt: null,
        pointsPossible: 5,
        resourceUrl: null,
        visible: true,
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(prisma.getActivityPatchData(), {
      title: 'Updated Assignment',
      description: 'New prompt',
      directions: null,
      language: 'python',
      languageLocked: false,
      starterCode: null,
      starterFiles: Prisma.JsonNull,
      expectedOutput: null,
      autograderEnabled: false,
      autograderReferenceSolution: null,
      autograderReferenceOutput: null,
      autograderCodeMatch: false,
      autograderOutputMatch: false,
      autograderTestCases: Prisma.JsonNull,
      studentFileTreeEnabled: true,
      studentEntrypointSelectionEnabled: true,
      dueAt: null,
      pointsPossible: 5,
      resourceUrl: null,
      visible: true,
    })
  } finally {
    await app.close()
  }
})

test('PATCH /lessons/:lessonId/visibility toggles all nested activities', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/lessons/l-1/visibility',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        visible: false,
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'l-1', visible: false })
    assert.deepEqual(prisma.getLessonVisibilityUpdate(), {
      where: { lessonId: 'l-1' },
      data: { visible: false },
    })
    assert.deepEqual(prisma.getLessonRecordUpdate(), {
      where: { id: 'l-1' },
      data: { visible: false },
    })
  } finally {
    await app.close()
  }
})

test('PATCH /units/:unitId/visibility toggles the unit, lessons, and activities together', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/units/u-1/visibility',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        visible: false,
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'u-1', visible: false })
    assert.deepEqual(prisma.getLessonVisibilityUpdate(), {
      where: { lesson: { unitId: 'u-1' } },
      data: { visible: false },
    })
    assert.deepEqual(prisma.getLessonBulkUpdate(), {
      where: { unitId: 'u-1' },
      data: { visible: false },
    })
    assert.deepEqual(prisma.getUnitVisibilityUpdate(), {
      where: { id: 'u-1' },
      data: { visible: false },
    })
  } finally {
    await app.close()
  }
})

test('PATCH /activities/:activityId/move swaps adjacent activity positions', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/activities/a-2/move',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        direction: 'up',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'a-2' })
    assert.deepEqual(prisma.getActivityUpdates(), [
      { id: 'a-2', position: -1, data: { position: -1 } },
      { id: 'a-1', position: 1, data: { position: 1 } },
      { id: 'a-2', position: 0, data: { position: 0 } },
    ])
  } finally {
    await app.close()
  }
})

test('PATCH /activities/:activityId/move can move an assignment to another lesson', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/activities/a-2/move',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        lessonId: 'l-2',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'a-2' })
    assert.deepEqual(prisma.getActivityUpdates(), [
      { id: 'a-1', position: 0, data: { position: 0 } },
      { id: 'a-2', position: 0, data: { lessonId: 'l-2', position: 0 } },
    ])
  } finally {
    await app.close()
  }
})

test('PATCH /activities/:activityId/move appends when destination lesson already has activities', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/activities/a-2/move',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        lessonId: 'l-3',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'a-2' })
    assert.deepEqual(prisma.getActivityUpdates(), [
      { id: 'a-1', position: 0, data: { position: 0 } },
      { id: 'a-9', position: 0, data: { position: 0 } },
      { id: 'a-2', position: 1, data: { lessonId: 'l-3', position: 1 } },
    ])
  } finally {
    await app.close()
  }
})

test('PATCH /units/:unitId/move swaps adjacent unit positions', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/units/u-2/move',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        direction: 'up',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'u-2' })
    assert.deepEqual(prisma.getUnitPositionUpdates(), [
      { id: 'u-2', position: -1, data: { position: -1 } },
      { id: 'u-1', position: 1, data: { position: 1 } },
      { id: 'u-2', position: 0, data: { position: 0 } },
    ])
  } finally {
    await app.close()
  }
})

test('PATCH /lessons/:lessonId/move swaps adjacent lesson positions', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/lessons/l-2/move',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        direction: 'up',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'l-2' })
    assert.deepEqual(prisma.getLessonPositionUpdates(), [
      { id: 'l-2', position: -1, data: { position: -1 } },
      { id: 'l-1', position: 1, data: { position: 1 } },
      { id: 'l-2', position: 0, data: { position: 0 } },
    ])
  } finally {
    await app.close()
  }
})

test('PATCH /units/:unitId/move is a no-op at the boundary', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/units/u-1/move',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        direction: 'up',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'u-1' })
    assert.deepEqual(prisma.getUnitPositionUpdates(), [])
  } finally {
    await app.close()
  }
})

test('PATCH /lessons/:lessonId/move is a no-op at the boundary', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/lessons/l-1/move',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        direction: 'up',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'l-1' })
    assert.deepEqual(prisma.getLessonPositionUpdates(), [])
  } finally {
    await app.close()
  }
})

test('PATCH /activities/:activityId/move is a no-op at the boundary', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/activities/a-1/move',
      headers: { 'x-user-id': 't-1', 'content-type': 'application/json' },
      payload: {
        direction: 'up',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: 'a-1' })
    assert.deepEqual(prisma.getActivityUpdates(), [])
  } finally {
    await app.close()
  }
})

test('DELETE /units/:unitId deletes the full unit tree', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'DELETE',
      url: '/units/u-1',
      headers: { 'x-user-id': 't-1' },
    })

    assert.equal(response.statusCode, 204)
    assert.equal(prisma.getDeletedUnitId(), 'u-1')
  } finally {
    await app.close()
  }
})

test('DELETE /lessons/:lessonId deletes the lesson tree', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'DELETE',
      url: '/lessons/l-1',
      headers: { 'x-user-id': 't-1' },
    })

    assert.equal(response.statusCode, 204)
    assert.equal(prisma.getDeletedLessonId(), 'l-1')
  } finally {
    await app.close()
  }
})

test('DELETE /activities/:activityId deletes the assignment', async () => {
  const prisma = buildCoursePrismaStub()
  const app = await buildApp({ prisma: prisma.stub })

  try {
    const response = await app.inject({
      method: 'DELETE',
      url: '/activities/a-1',
      headers: { 'x-user-id': 't-1' },
    })

    assert.equal(response.statusCode, 204)
    assert.equal(prisma.getDeletedActivityId(), 'a-1')
  } finally {
    await app.close()
  }
})
