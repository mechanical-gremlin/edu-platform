import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../../app.js'

const buildCoursePrismaStub = () => {
  const unitPositionUpdates: Array<{ id: string; position?: number; data: Record<string, unknown> }> = []
  const lessonPositionUpdates: Array<{ id: string; position?: number; data: Record<string, unknown> }> = []
  const activityUpdates: Array<{ id: string; position?: number; data: Record<string, unknown> }> = []
  let unitUpdateData: Record<string, unknown> | null = null
  let activityPatchData: Record<string, unknown> | null = null
  let lessonVisibilityUpdate: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null
  let lessonRecordUpdate: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null
  let lessonBulkUpdate: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null
  let unitVisibilityUpdate: { where: Record<string, unknown>; data: Record<string, unknown> } | null = null
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
      findUnique: async ({ where }: { where: { userId_courseId: { userId: string; courseId: string } } }) => {
        if (where.userId_courseId.userId === 't-1' && where.userId_courseId.courseId === 'c-1') {
          return { role: 'teacher' }
        }

        return null
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
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === 'a-1') {
          return {
            id: 'a-1',
            title: 'Assignment 1',
            pointsPossible: 10,
            lessonId: 'l-1',
            lesson: { unit: { courseId: 'c-1' } },
          }
        }

        if (where.id === 'a-2') {
          return {
            id: 'a-2',
            title: 'Assignment 2',
            pointsPossible: 20,
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
          type: 'project',
          description: String(data.description ?? 'Assignment summary'),
          directions: (data.directions as string | null | undefined) ?? null,
          language: null,
          languageLocked: false,
          starterCode: null,
          starterFiles: null,
          expectedOutput: null,
          autograderEnabled: false,
          resourceUrl: (data.resourceUrl as string | null | undefined) ?? null,
          visible: true,
          dueAt: (data.dueAt as Date | null | undefined) ?? null,
          pointsPossible: Number(data.pointsPossible ?? 10),
        }
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        lessonVisibilityUpdate = { where, data }
        return { count: 2 }
      },
      findMany: async () => [
        { id: 'a-1', position: 0 },
        { id: 'a-2', position: 1 },
      ],
      delete: async ({ where }: { where: { id: string } }) => {
        deletedActivityId = where.id
        return { id: where.id }
      },
    },
    $transaction: async (callback: (tx: any) => Promise<unknown>) => callback(stub),
    $disconnect: async () => undefined,
  }

  return {
    stub,
    getUnitUpdateData: () => unitUpdateData,
    getUnitPositionUpdates: () => unitPositionUpdates,
    getActivityPatchData: () => activityPatchData,
    getLessonVisibilityUpdate: () => lessonVisibilityUpdate,
    getLessonRecordUpdate: () => lessonRecordUpdate,
    getLessonBulkUpdate: () => lessonBulkUpdate,
    getLessonPositionUpdates: () => lessonPositionUpdates,
    getUnitVisibilityUpdate: () => unitVisibilityUpdate,
    getActivityUpdates: () => activityUpdates,
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

    assert.equal(response.statusCode, 200)
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
        description: 'New prompt',
        directions: '<p>Follow the updated steps.</p>',
        dueAt: '2026-09-30T23:59:00.000Z',
        pointsPossible: 25,
        resourceUrl: 'https://example.edu/activity',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().title, 'Updated Assignment')
    assert.deepEqual(prisma.getActivityPatchData(), {
      title: 'Updated Assignment',
      description: 'New prompt',
      directions: '<p>Follow the updated steps.</p>',
      dueAt: new Date('2026-09-30T23:59:00.000Z'),
      pointsPossible: 25,
      resourceUrl: 'https://example.edu/activity',
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
        description: 'New prompt',
        directions: null,
        dueAt: null,
        pointsPossible: 5,
        resourceUrl: null,
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(prisma.getActivityPatchData(), {
      title: 'Updated Assignment',
      description: 'New prompt',
      directions: null,
      dueAt: null,
      pointsPossible: 5,
      resourceUrl: null,
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
      { id: 'a-2', position: 0, data: { lessonId: 'l-2', position: 0 } },
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
