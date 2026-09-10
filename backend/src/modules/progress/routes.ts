import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AppError, iso, requireRole } from '../../lib.js'

const courseParamsSchema = z.object({ courseId: z.string().trim().min(1) })

const progressResponseSchema = z.object({
  courseId: z.string(),
  overall: z.object({
    completed: z.int(),
    total: z.int(),
    percent: z.int(),
  }),
  units: z.array(
    z.object({
      unitId: z.string(),
      title: z.string(),
      completed: z.int(),
      total: z.int(),
      percent: z.int(),
      lateCount: z.int(),
    }),
  ),
  lateActivities: z.array(
    z.object({
      activityId: z.string(),
      title: z.string(),
      dueAt: z.string(),
    }),
  ),
})

const percent = (completed: number, total: number) => (total === 0 ? 0 : Math.round((completed / total) * 100))

export const progressRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/courses/:courseId/progress',
    {
      schema: {
        params: courseParamsSchema,
        response: {
          200: progressResponseSchema,
        },
      },
    },
    async (request) => {
      const user = requireRole(request, 'student')
      const { courseId } = courseParamsSchema.parse(request.params)
      const enrollment = await app.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId,
          },
        },
        select: { role: true },
      })

      if (!enrollment || enrollment.role !== 'student') {
        throw new AppError(403, 'Student is not enrolled in this course')
      }

      const course = await app.prisma.course.findUnique({
        where: { id: courseId },
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
                      submissions: {
                        where: { studentId: user.id },
                      },
                      grades: {
                        where: { studentId: user.id },
                      },
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

      const now = new Date()
      const lateActivities: Array<{ activityId: string; title: string; dueAt: string }> = []
      let overallCompleted = 0
      let overallTotal = 0

      const units = course.units.map((unit) => {
        const activities = unit.lessons.flatMap((lesson) => lesson.activities)
        let completed = 0
        let lateCount = 0

        for (const activity of activities) {
          overallTotal += 1
          const submission = activity.submissions[0]
          const grade = activity.grades[0]
          const isCompleted = submission?.status === 'submitted' || grade?.pointsEarned !== null
          if (isCompleted) {
            completed += 1
            overallCompleted += 1
          }

          if (!isCompleted && activity.dueAt && activity.dueAt < now) {
            lateCount += 1
            lateActivities.push({
              activityId: activity.id,
              title: activity.title,
              dueAt: iso(activity.dueAt)!,
            })
          }
        }

        return {
          unitId: unit.id,
          title: unit.title,
          completed,
          total: activities.length,
          percent: percent(completed, activities.length),
          lateCount,
        }
      })

      lateActivities.sort((left, right) => left.dueAt.localeCompare(right.dueAt))

      return {
        courseId,
        overall: {
          completed: overallCompleted,
          total: overallTotal,
          percent: percent(overallCompleted, overallTotal),
        },
        units,
        lateActivities,
      }
    },
  )
}
