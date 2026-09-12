import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AppError, iso, requireRole } from '../../lib.js'

const starterFileSchema = z.object({
  name: z.string(),
  language: z.string(),
  content: z.string(),
})

const courseParamsSchema = z.object({ courseId: z.string().trim().min(1) })
const putGradeBodySchema = z.object({
  studentId: z.string().trim().min(1),
  activityId: z.string().trim().min(1),
  pointsEarned: z.int().min(0).nullable(),
  comment: z.string().trim().max(2000).optional().nullable(),
})

const gradebookResponseSchema = z.object({
  courseId: z.string(),
  activities: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      pointsPossible: z.int(),
      visible: z.boolean(),
    }),
  ),
  students: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      grades: z.array(
        z.object({
          activityId: z.string(),
          submitted: z.boolean(),
          pointsEarned: z.int().nullable(),
          pointsPossible: z.int(),
          comment: z.string().nullable(),
          gradedAt: z.string().nullable(),
          submittedAt: z.string().nullable(),
          submissionText: z.string().nullable(),
          submissionFiles: z.array(starterFileSchema).nullable(),
        }),
      ),
    }),
  ),
})

const gradeResponseSchema = z.object({
  studentId: z.string(),
  activityId: z.string(),
  pointsEarned: z.int().nullable(),
  comment: z.string().nullable(),
  gradedById: z.string().nullable(),
  gradedAt: z.string().nullable(),
})

const meGradesResponseSchema = z.array(
  z.object({
    courseId: z.string(),
    courseCode: z.string(),
    courseTitle: z.string(),
    activityId: z.string(),
    activityTitle: z.string(),
    pointsEarned: z.int().nullable(),
    pointsPossible: z.int(),
    submitted: z.boolean(),
    comment: z.string().nullable(),
    gradedAt: z.string().nullable(),
    submittedAt: z.string().nullable(),
    submissionText: z.string().nullable(),
    submissionFiles: z.array(starterFileSchema).nullable(),
  }),
)

const getSubmissionText = (content: unknown) => {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return null
  }

  const responseText = Reflect.get(content, 'responseText')
  return typeof responseText === 'string' && responseText.trim() ? responseText : null
}

const getSubmissionFiles = (content: unknown) => {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return null
  }

  const submissionFiles = Reflect.get(content, 'submissionFiles')
  const parsed = z.array(starterFileSchema).safeParse(submissionFiles)
  if (parsed.success && parsed.data.length > 0) {
    return parsed.data
  }

  const responseText = Reflect.get(content, 'responseText')
  if (typeof responseText !== 'string' || !responseText.trim()) {
    return null
  }

  try {
    const fallbackParsed = z.array(starterFileSchema).safeParse(
      JSON.parse(responseText),
    )
    return fallbackParsed.success && fallbackParsed.data.length > 0 ? fallbackParsed.data : null
  } catch {
    return null
  }
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

export const gradeRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/courses/:courseId/gradebook',
    {
      schema: {
        params: courseParamsSchema,
        response: {
          200: gradebookResponseSchema,
        },
      },
    },
    async (request) => {
      const user = requireRole(request, 'teacher')
      const { courseId } = courseParamsSchema.parse(request.params)
      await assertTeacherForCourse(app, courseId, user.id)

      const course = await app.prisma.course.findUnique({
        where: { id: courseId },
        include: {
          enrollments: {
            where: { role: 'student' },
            orderBy: { user: { name: 'asc' } },
            include: { user: { select: { id: true, name: true } } },
          },
          units: {
            orderBy: { position: 'asc' },
            include: {
              lessons: {
                orderBy: { position: 'asc' },
                include: {
                  activities: {
                    orderBy: { position: 'asc' },
                    include: {
                      submissions: true,
                      grades: true,
                    },
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

      const activities = course.units.flatMap((unit) =>
        unit.lessons.flatMap((lesson) =>
          lesson.activities.map((activity) => ({
            id: activity.id,
            title: activity.title,
            pointsPossible: activity.pointsPossible,
            visible: activity.visible,
            submissions: activity.submissions,
            grades: activity.grades,
          })),
        ),
      )

      return {
        courseId: course.id,
        activities: activities.map((activity) => ({
          id: activity.id,
          title: activity.title,
          pointsPossible: activity.pointsPossible,
          visible: activity.visible,
        })),
        students: course.enrollments.map((enrollment) => ({
          id: enrollment.user.id,
          name: enrollment.user.name,
          grades: activities.map((activity) => {
            const submission = activity.submissions.find((item) => item.studentId === enrollment.user.id)
            const grade = activity.grades.find((item) => item.studentId === enrollment.user.id)
            return {
              activityId: activity.id,
              submitted: submission?.status === 'submitted',
              pointsEarned: grade?.pointsEarned ?? null,
              pointsPossible: activity.pointsPossible,
              comment: grade?.comment ?? null,
              gradedAt: iso(grade?.gradedAt),
              submittedAt: iso(submission?.submittedAt),
              submissionText: getSubmissionText(submission?.content),
              submissionFiles: getSubmissionFiles(submission?.content),
            }
          }),
        })),
      }
    },
  )

  app.put(
    '/grades',
    {
      schema: {
        body: putGradeBodySchema,
        response: {
          200: gradeResponseSchema,
        },
      },
    },
    async (request) => {
      const user = requireRole(request, 'teacher')
      const payload = putGradeBodySchema.parse(request.body)
      const activity = await app.prisma.activity.findUnique({
        where: { id: payload.activityId },
        select: {
          id: true,
          pointsPossible: true,
          lesson: { select: { unit: { select: { courseId: true } } } },
        },
      })

      if (!activity) {
        throw new AppError(404, 'Activity not found')
      }

      if (payload.pointsEarned !== null && payload.pointsEarned > activity.pointsPossible) {
        throw new AppError(400, 'pointsEarned cannot exceed pointsPossible')
      }

      await assertTeacherForCourse(app, activity.lesson.unit.courseId, user.id)

      const studentEnrollment = await app.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: payload.studentId,
            courseId: activity.lesson.unit.courseId,
          },
        },
        select: { role: true },
      })

      if (!studentEnrollment || studentEnrollment.role !== 'student') {
        throw new AppError(400, 'Student is not enrolled in the activity course')
      }

      const grade = await app.prisma.grade.upsert({
        where: {
          studentId_activityId: {
            studentId: payload.studentId,
            activityId: payload.activityId,
          },
        },
        update: {
          pointsEarned: payload.pointsEarned,
          comment: payload.comment ?? null,
          gradedById: user.id,
          gradedAt: new Date(),
        },
        create: {
          studentId: payload.studentId,
          activityId: payload.activityId,
          pointsEarned: payload.pointsEarned,
          comment: payload.comment ?? null,
          gradedById: user.id,
          gradedAt: new Date(),
        },
      })

      return {
        studentId: grade.studentId,
        activityId: grade.activityId,
        pointsEarned: grade.pointsEarned,
        comment: grade.comment,
        gradedById: grade.gradedById,
        gradedAt: iso(grade.gradedAt),
      }
    },
  )

  app.get(
    '/me/grades',
    {
      schema: {
        response: {
          200: meGradesResponseSchema,
        },
      },
    },
    async (request) => {
      const user = requireRole(request, 'student')
      const enrollments = await app.prisma.enrollment.findMany({
        where: { userId: user.id, role: 'student' },
        include: {
          course: {
            include: {
              units: {
                orderBy: { position: 'asc' },
                include: {
                  lessons: {
                    orderBy: { position: 'asc' },
                    include: {
                      activities: {
                        where: { visible: true },
                        orderBy: { position: 'asc' },
                        include: {
                          grades: {
                            where: { studentId: user.id },
                          },
                          submissions: {
                            where: { studentId: user.id },
                          },
                        },
                      },
                    },
                  },
                }
              },
            },
          },
        },
      })

      return enrollments
        .flatMap((enrollment) =>
          enrollment.course.units.flatMap((unit) =>
            unit.lessons.flatMap((lesson) =>
              lesson.activities.map((activity) => {
                const grade = activity.grades[0]
                const submission = activity.submissions[0]
                return {
                  courseId: enrollment.course.id,
                  courseCode: enrollment.course.code,
                  courseTitle: enrollment.course.title,
                  activityId: activity.id,
                  activityTitle: activity.title,
                  pointsEarned: grade?.pointsEarned ?? null,
                  pointsPossible: activity.pointsPossible,
                  submitted: submission?.status === 'submitted',
                  comment: grade?.comment ?? null,
                  gradedAt: iso(grade?.gradedAt),
                  submittedAt: iso(submission?.submittedAt),
                  submissionText: getSubmissionText(submission?.content),
                  submissionFiles: getSubmissionFiles(submission?.content),
                }
              }),
            ),
          ),
        )
        .sort((left, right) => left.activityTitle.localeCompare(right.activityTitle))
    },
  )
}
