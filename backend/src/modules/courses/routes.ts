import { randomUUID } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { AppError, iso, requireRole, requireUser } from '../../lib.js'
import {
  autogradeCodingSubmission,
  autograderTestCaseSchema,
  buildAutograderComment,
  getAutograderPoints,
  isAutograderLanguageSupported,
  parseAutograderTestCases,
} from '../autograder/service.js'
import { executeWithJudge0 } from '../execute/judge0.js'

const activityTypeSchema = z.enum(['video', 'coding', 'quiz', 'project', 'godot'])
const namedEntitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
})
const starterFileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  language: z.string().trim().min(1).max(50),
  content: z.string().max(50_000),
})

const createActivityBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: activityTypeSchema,
  description: z.string().trim().min(1).max(5000),
  directions: z.string().trim().max(20000).optional().nullable(),
  language: z.string().trim().max(50).optional().nullable(),
  languageLocked: z.boolean().optional(),
  starterCode: z.string().trim().max(50_000).optional().nullable(),
  starterFiles: z.array(starterFileSchema).max(20).optional().nullable(),
  expectedOutput: z.string().trim().max(4096).optional().nullable(),
  autograderEnabled: z.boolean().optional(),
  autograderReferenceSolution: z.string().trim().max(50_000).optional().nullable(),
  autograderReferenceOutput: z.string().trim().max(4096).optional().nullable(),
  autograderCodeMatch: z.boolean().optional(),
  autograderOutputMatch: z.boolean().optional(),
  autograderTestCases: z.array(autograderTestCaseSchema).max(10).optional().nullable(),
  dueAt: z.iso.datetime().optional().nullable(),
  pointsPossible: z.int().min(0).max(1000),
  resourceUrl: z.url().optional().nullable(),
  visible: z.boolean().optional(),
}).superRefine((value, context) => {
  if (!value.autograderEnabled) {
    return
  }

  if (value.type !== 'coding') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['autograderEnabled'],
      message: 'Autograder is only available for coding activities',
    })
  }

  if (!isAutograderLanguageSupported(value.language)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['language'],
      message: 'Autograder currently supports executable Judge0 languages only',
    })
  }

  if (!value.autograderReferenceSolution?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['autograderReferenceSolution'],
      message: 'Suggested solution is required when autograder is enabled',
    })
  }

  const hasAnyCheck = Boolean(
    value.autograderCodeMatch
    || value.autograderOutputMatch
    || (value.autograderTestCases?.length ?? 0) > 0,
  )

  if (!hasAnyCheck) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['autograderEnabled'],
      message: 'Select at least one autograder check',
    })
  }

  if (value.autograderOutputMatch && !value.autograderReferenceOutput?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['autograderReferenceOutput'],
      message: 'Reference output is required when output matching is enabled',
    })
  }
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

const createCourseBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(20),
  description: z.string().trim().max(2000).optional().nullable(),
})

const enrollmentBodySchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(['teacher', 'student']).optional().default('student'),
})

const enrollmentResponseSchema = z.object({
  userId: z.string(),
  courseId: z.string(),
  role: z.enum(['teacher', 'student']),
})

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
              language: z.string().nullable(),
              languageLocked: z.boolean(),
              starterCode: z.string().nullable(),
              starterFiles: z.array(starterFileSchema).nullable(),
              expectedOutput: z.string().nullable(),
              autograderEnabled: z.boolean(),
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
  language: z.string().nullable(),
  languageLocked: z.boolean(),
  starterCode: z.string().nullable(),
  starterFiles: z.array(starterFileSchema).nullable(),
  expectedOutput: z.string().nullable(),
  autograderEnabled: z.boolean(),
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

  app.post(
    '/courses',
    {
      schema: {
        body: createCourseBodySchema,
        response: {
          201: mutationResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = requireRole(request, 'teacher')
      const payload = createCourseBodySchema.parse(request.body)

      const existing = await app.prisma.course.findUnique({ where: { code: payload.code }, select: { id: true } })
      if (existing) {
        throw new AppError(409, `A course with code "${payload.code}" already exists`)
      }

      const course = await app.prisma.course.create({
        data: {
          id: randomUUID(),
          title: payload.title,
          code: payload.code,
          description: payload.description ?? null,
          enrollments: {
            create: {
              userId: user.id,
              role: 'teacher',
            },
          },
        },
      })

      reply.code(201)
      return {
        id: course.id,
        title: course.title,
        description: course.description,
      }
    },
  )

  app.post(
    '/courses/:courseId/enrollments',
    {
      schema: {
        params: courseParamsSchema,
        body: enrollmentBodySchema,
        response: {
          201: enrollmentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = requireRole(request, 'teacher')
      const { courseId } = courseParamsSchema.parse(request.params)
      const payload = enrollmentBodySchema.parse(request.body)
      await assertTeacherForCourse(app, courseId, user.id)

      const targetUser = await app.prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } })
      if (!targetUser) {
        throw new AppError(404, 'User not found')
      }

      const enrollment = await app.prisma.enrollment.upsert({
        where: { userId_courseId: { userId: payload.userId, courseId } },
        update: { role: payload.role },
        create: { userId: payload.userId, courseId, role: payload.role },
      })

      reply.code(201)
      return {
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        role: enrollment.role as 'teacher' | 'student',
      }
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
                language: activity.language,
                languageLocked: activity.languageLocked,
                starterCode: activity.starterCode,
                starterFiles: (activity.starterFiles as { name: string; language: string; content: string }[] | null) ?? null,
                expectedOutput: activity.expectedOutput,
                autograderEnabled: activity.autograderEnabled,
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
          language: payload.language ?? null,
          languageLocked: payload.languageLocked ?? false,
          starterCode: payload.starterCode ?? null,
          starterFiles: payload.starterFiles ? (payload.starterFiles as Prisma.InputJsonValue) : Prisma.JsonNull,
          expectedOutput: payload.expectedOutput ?? null,
          autograderEnabled: payload.autograderEnabled ?? false,
          autograderReferenceSolution: payload.autograderEnabled ? payload.autograderReferenceSolution ?? null : null,
          autograderReferenceOutput: payload.autograderEnabled ? payload.autograderReferenceOutput ?? null : null,
          autograderCodeMatch: payload.autograderEnabled ? payload.autograderCodeMatch ?? false : false,
          autograderOutputMatch: payload.autograderEnabled ? payload.autograderOutputMatch ?? false : false,
          autograderTestCases: payload.autograderEnabled && payload.autograderTestCases
            ? (payload.autograderTestCases as Prisma.InputJsonValue)
            : Prisma.JsonNull,
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
        language: activity.language,
        languageLocked: activity.languageLocked,
        starterCode: activity.starterCode,
        starterFiles: (activity.starterFiles as { name: string; language: string; content: string }[] | null) ?? null,
        expectedOutput: activity.expectedOutput,
        autograderEnabled: activity.autograderEnabled,
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
        language: updated.language,
        languageLocked: updated.languageLocked,
        starterCode: updated.starterCode,
        starterFiles: (updated.starterFiles as { name: string; language: string; content: string }[] | null) ?? null,
        expectedOutput: updated.expectedOutput,
        autograderEnabled: updated.autograderEnabled,
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
          type: true,
          language: true,
          visible: true,
          pointsPossible: true,
          autograderEnabled: true,
          autograderReferenceSolution: true,
          autograderReferenceOutput: true,
          autograderCodeMatch: true,
          autograderOutputMatch: true,
          autograderTestCases: true,
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
      const response = {
        id: submission.id,
        studentId: submission.studentId,
        activityId: submission.activityId,
        status: submission.status,
        submittedAt: iso(submission.submittedAt),
      }

      if (
        activity.type === 'coding'
        && activity.autograderEnabled
        && isAutograderLanguageSupported(activity.language)
        && typeof Reflect.get(payload.content ?? {}, 'responseText') === 'string'
      ) {
        const submissionCode = String(Reflect.get(payload.content ?? {}, 'responseText')).trim()
        const testCases = parseAutograderTestCases(activity.autograderTestCases)

        if (
          submissionCode
          && activity.autograderReferenceSolution?.trim()
          && (activity.autograderCodeMatch || activity.autograderOutputMatch || testCases.length > 0)
        ) {
          const autograderResult = await autogradeCodingSubmission({
            language: activity.language!,
            submissionCode,
            referenceSolution: activity.autograderReferenceSolution,
            referenceOutput: activity.autograderReferenceOutput,
            outputMatch: activity.autograderOutputMatch,
            codeMatch: activity.autograderCodeMatch,
            testCases,
            execute: executeWithJudge0,
          })

          const existingGrade = await app.prisma.grade.findUnique({
            where: {
              studentId_activityId: {
                studentId: user.id,
                activityId,
              },
            },
            select: {
              id: true,
              gradingSource: true,
            },
          })

          const autograderPayload = {
            autograderResult: autograderResult as Prisma.InputJsonValue,
          }

          if (existingGrade?.gradingSource === 'manual') {
            await app.prisma.grade.update({
              where: { id: existingGrade.id },
              data: autograderPayload,
            })
          } else {
            await app.prisma.grade.upsert({
              where: {
                studentId_activityId: {
                  studentId: user.id,
                  activityId,
                },
              },
              update: {
                pointsEarned: getAutograderPoints(autograderResult.score, activity.pointsPossible),
                comment: buildAutograderComment(autograderResult),
                gradingSource: 'autograder',
                gradedById: null,
                gradedAt: new Date(),
                ...autograderPayload,
              },
              create: {
                id: randomUUID(),
                studentId: user.id,
                activityId,
                pointsEarned: getAutograderPoints(autograderResult.score, activity.pointsPossible),
                comment: buildAutograderComment(autograderResult),
                gradingSource: 'autograder',
                gradedById: null,
                gradedAt: new Date(),
                ...autograderPayload,
              },
            })
          }
        }
      }

      return response
    },
  )
}
