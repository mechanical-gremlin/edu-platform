import { randomUUID } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { AppError, iso, requireRole, requireUser } from '../../lib.js'

const activityTypeSchema = z.enum(['video', 'coding', 'quiz', 'project', 'godot'])
const namedEntitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
})
const createActivityBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: activityTypeSchema,
  description: z.string().trim().min(1).max(5000),
  directions: z.string().trim().max(20000).optional().nullable(),
  dueAt: z.iso.datetime().optional().nullable(),
  pointsPossible: z.int().min(0).max(1000),
  resourceUrl: z.url().optional().nullable(),
  visible: z.boolean().optional(),
})
const visibilitySchema = z.object({
  visible: z.boolean(),
})
const directionsSchema = z.object({
  directions: z.string().trim().max(20000).optional().nullable(),
})
const submissionBodySchema = z.object({
  content: z.record(z.string(), z.unknown()).optional().nullable(),
})
const courseParamsSchema = z.object({ courseId: z.string().trim().min(1) })
const unitParamsSchema = z.object({ unitId: z.string().trim().min(1) })
const lessonParamsSchema = z.object({ lessonId: z.string().trim().min(1) })
const activityParamsSchema = z.object({ activityId: z.string().trim().min(1) })

const courseListSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    code: z.string(),
    description: z.string().nullable(),
    teacherName: z.string().nullable(),
  }),
)

const courseTreeSchema = z.object({
  id: z.string(),
  title: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  teacherName: z.string().nullable(),
  units: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      lessons: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          activities: z.array(
            z.object({
              id: z.string(),
              title: z.string(),
              type: activityTypeSchema,
              description: z.string(),
              directions: z.string().nullable(),
              resourceUrl: z.string().nullable(),
              visible: z.boolean(),
              dueAt: z.string().nullable(),
              pointsPossible: z.int(),
            }),
          ),
        }),
      ),
    }),
  ),
})

const mutationResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
})

const activityResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: activityTypeSchema,
  description: z.string(),
  directions: z.string().nullable(),
  resourceUrl: z.string().nullable(),
  visible: z.boolean(),
  dueAt: z.string().nullable(),
  pointsPossible: z.int(),
})

const visibilityResponseSchema = z.object({
  id: z.string(),
  visible: z.boolean(),
})

const submissionResponseSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  activityId: z.string(),
  status: z.enum(['in_progress', 'submitted']),
  submittedAt: z.string().nullable(),
})

const getCourseForUser = async (app: Parameters<FastifyPluginAsync>[0], courseId: string, userId: string) => {
  const course = await app.prisma.course.findUnique({
    where: { id: courseId },
    include: {
      enrollments: {
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      },
      units: {
        orderBy: { position: 'asc' },
        include: {
          lessons: {
            orderBy: { position: 'asc' },
            include: {
              activities: {
                orderBy: { position: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  if (!course) {
    throw new AppError(404, 'Course not found')
  }

  const enrollment = course.enrollments.find((item) => item.userId === userId)
  if (!enrollment) {
    throw new AppError(403, 'Course access denied')
  }

  return { course, enrollment }
}

const assertTeacherForCourse = async (app: Parameters<FastifyPluginAsync>[0], courseId: string, userId: string) => {
  const enrollment = await app.prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: { role: true },
  })

  if (!enrollment || enrollment.role !== 'teacher') {
    throw new AppError(403, 'Teacher access required for this course')
  }
}

const findTeacherCourseIdFromUnit = async (app: Parameters<FastifyPluginAsync>[0], unitId: string) => {
  const unit = await app.prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, title: true, description: true, courseId: true },
  })

  if (!unit) {
    throw new AppError(404, 'Unit not found')
  }

  return unit
}

const findTeacherLesson = async (app: Parameters<FastifyPluginAsync>[0], lessonId: string) => {
  const lesson = await app.prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, title: true, description: true, unitId: true, unit: { select: { courseId: true } } },
  })

  if (!lesson) {
    throw new AppError(404, 'Lesson not found')
  }

  return lesson
}

const findTeacherActivity = async (app: Parameters<FastifyPluginAsync>[0], activityId: string) => {
  const activity = await app.prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      title: true,
      pointsPossible: true,
      lesson: { select: { unit: { select: { courseId: true } } } },
    },
  })

  if (!activity) {
    throw new AppError(404, 'Activity not found')
  }

  return activity
}

export const courseRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/courses',
    {
      schema: {
        response: {
          200: courseListSchema,
        },
      },
    },
    async (request) => {
      const user = requireUser(request)
      const courses = await app.prisma.course.findMany({
        where: {
          enrollments: {
            some: {
              userId: user.id,
            },
          },
        },
        include: {
          enrollments: {
            where: { role: 'teacher' },
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { code: 'asc' },
      })

      return courses.map((course) => ({
        id: course.id,
        title: course.title,
        code: course.code,
        description: course.description,
        teacherName: course.enrollments[0]?.user.name ?? null,
      }))
    },
  )

  app.get(
    '/courses/:courseId',
    {
      schema: {
        params: courseParamsSchema,
        response: {
          200: courseTreeSchema,
        },
      },
    },
    async (request) => {
      const user = requireUser(request)
      const { courseId } = courseParamsSchema.parse(request.params)
      const { course } = await getCourseForUser(app, courseId, user.id)
      const isTeacher = user.role === 'teacher'

      return {
        id: course.id,
        title: course.title,
        code: course.code,
        description: course.description,
        teacherName: course.enrollments.find((item) => item.role === 'teacher')?.user.name ?? null,
        units: course.units.map((unit) => ({
          id: unit.id,
          title: unit.title,
          description: unit.description,
          lessons: unit.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            activities: lesson.activities
              .filter((activity) => isTeacher || activity.visible)
              .map((activity) => ({
                id: activity.id,
                title: activity.title,
                type: activity.type,
                description: activity.description,
                directions: activity.directions,
                resourceUrl: activity.resourceUrl,
                visible: activity.visible,
                dueAt: iso(activity.dueAt),
                pointsPossible: activity.pointsPossible,
              })),
          })),
        })),
      }
    },
  )

  app.post(
    '/courses/:courseId/units',
    {
      schema: {
        params: courseParamsSchema,
        body: namedEntitySchema,
        response: {
          201: mutationResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = requireRole(request, 'teacher')
      const { courseId } = courseParamsSchema.parse(request.params)
      const payload = namedEntitySchema.parse(request.body)
      await assertTeacherForCourse(app, courseId, user.id)

      const maxPosition = await app.prisma.unit.aggregate({
        where: { courseId },
        _max: { position: true },
      })

      const unit = await app.prisma.unit.create({
        data: {
          id: randomUUID(),
          courseId,
          title: payload.title,
          description: payload.description ?? null,
          position: (maxPosition._max.position ?? -1) + 1,
        },
      })

      reply.code(201)
      return {
        id: unit.id,
        title: unit.title,
        description: unit.description,
      }
    },
  )

  app.post(
    '/units/:unitId/lessons',
    {
      schema: {
        params: unitParamsSchema,
        body: namedEntitySchema,
        response: {
          201: mutationResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = requireRole(request, 'teacher')
      const { unitId } = unitParamsSchema.parse(request.params)
      const payload = namedEntitySchema.parse(request.body)
      const unit = await findTeacherCourseIdFromUnit(app, unitId)
      await assertTeacherForCourse(app, unit.courseId, user.id)

      const maxPosition = await app.prisma.lesson.aggregate({
        where: { unitId },
        _max: { position: true },
      })

      const lesson = await app.prisma.lesson.create({
        data: {
          id: randomUUID(),
          unitId,
          title: payload.title,
          description: payload.description ?? null,
          position: (maxPosition._max.position ?? -1) + 1,
        },
      })

      reply.code(201)
      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
      }
    },
  )

  app.post(
    '/lessons/:lessonId/activities',
    {
      schema: {
        params: lessonParamsSchema,
        body: createActivityBodySchema,
        response: {
          201: activityResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = requireRole(request, 'teacher')
      const { lessonId } = lessonParamsSchema.parse(request.params)
      const payload = createActivityBodySchema.parse(request.body)
      const lesson = await findTeacherLesson(app, lessonId)
      await assertTeacherForCourse(app, lesson.unit.courseId, user.id)

      const maxPosition = await app.prisma.activity.aggregate({
        where: { lessonId },
        _max: { position: true },
      })

      const activity = await app.prisma.activity.create({
        data: {
          id: randomUUID(),
          lessonId,
          title: payload.title,
          type: payload.type,
          description: payload.description,
          directions: payload.directions ?? null,
          dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
          pointsPossible: payload.pointsPossible,
          resourceUrl: payload.resourceUrl ?? null,
          visible: payload.visible ?? true,
          position: (maxPosition._max.position ?? -1) + 1,
        },
      })

      reply.code(201)
      return {
        id: activity.id,
        title: activity.title,
        type: activity.type,
        description: activity.description,
        directions: activity.directions,
        resourceUrl: activity.resourceUrl,
        visible: activity.visible,
        dueAt: iso(activity.dueAt),
        pointsPossible: activity.pointsPossible,
      }
    },
  )

  app.patch(
    '/activities/:activityId/directions',
    {
      schema: {
        params: activityParamsSchema,
        body: directionsSchema,
        response: {
          200: activityResponseSchema,
        },
      },
    },
    async (request) => {
      const user = requireRole(request, 'teacher')
      const { activityId } = activityParamsSchema.parse(request.params)
      const payload = directionsSchema.parse(request.body)
      const activity = await findTeacherActivity(app, activityId)
      await assertTeacherForCourse(app, activity.lesson.unit.courseId, user.id)

      const updated = await app.prisma.activity.update({
        where: { id: activityId },
        data: { directions: payload.directions ?? null },
      })

      return {
        id: updated.id,
        title: updated.title,
        type: updated.type,
        description: updated.description,
        directions: updated.directions,
        resourceUrl: updated.resourceUrl,
        visible: updated.visible,
        dueAt: iso(updated.dueAt),
        pointsPossible: updated.pointsPossible,
      }
    },
  )

  app.patch(
    '/activities/:activityId/visibility',
    {
      schema: {
        params: activityParamsSchema,
        body: visibilitySchema,
        response: {
          200: visibilityResponseSchema,
        },
      },
    },
    async (request) => {
      const user = requireRole(request, 'teacher')
      const { activityId } = activityParamsSchema.parse(request.params)
      const payload = visibilitySchema.parse(request.body)
      const activity = await findTeacherActivity(app, activityId)
      await assertTeacherForCourse(app, activity.lesson.unit.courseId, user.id)

      const updated = await app.prisma.activity.update({
        where: { id: activityId },
        data: { visible: payload.visible },
      })

      return { id: updated.id, visible: updated.visible }
    },
  )

  app.post(
    '/activities/:activityId/submissions',
    {
      schema: {
        params: activityParamsSchema,
        body: submissionBodySchema,
        response: {
          201: submissionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = requireRole(request, 'student')
      const { activityId } = activityParamsSchema.parse(request.params)
      const payload = submissionBodySchema.parse(request.body)
      const content = (payload.content ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull
      const activity = await app.prisma.activity.findUnique({
        where: { id: activityId },
        select: {
          id: true,
          visible: true,
          lesson: { select: { unit: { select: { courseId: true } } } },
        },
      })

      if (!activity) {
        throw new AppError(404, 'Activity not found')
      }

      const enrollment = await app.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: activity.lesson.unit.courseId,
          },
        },
        select: { role: true },
      })

      if (!enrollment || enrollment.role !== 'student') {
        throw new AppError(403, 'Student is not enrolled in this course')
      }

      if (!activity.visible) {
        throw new AppError(403, 'Hidden activities cannot accept submissions')
      }

      const submission = await app.prisma.submission.upsert({
        where: {
          studentId_activityId: {
            studentId: user.id,
            activityId,
          },
        },
        update: {
          status: 'submitted',
          submittedAt: new Date(),
          content,
        },
        create: {
          id: randomUUID(),
          studentId: user.id,
          activityId,
          status: 'submitted',
          submittedAt: new Date(),
          content,
        },
      })

      reply.code(201)
      return {
        id: submission.id,
        studentId: submission.studentId,
        activityId: submission.activityId,
        status: submission.status,
        submittedAt: iso(submission.submittedAt),
      }
    },
  )
}
