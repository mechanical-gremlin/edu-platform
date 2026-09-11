import type { Course, GradebookEntry } from '../types/models'

const isComplete = (activityId: string, userId: string, gradebookEntries: GradebookEntry[]) => {
  const entry = gradebookEntries.find(
    (gradebookEntry) => gradebookEntry.activityId === activityId && gradebookEntry.studentId === userId,
  )

  return Boolean(entry?.submitted || (entry?.pointsEarned !== null && entry?.pointsEarned !== undefined))
}

export const getCourseProgress = (
  course: Course,
  userId: string,
  gradebookEntries: GradebookEntry[],
): number => {
  const allActivities = course.units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.activities))

  if (allActivities.length === 0) {
    return 0
  }

  const completedCount = allActivities.filter((activity) =>
    isComplete(activity.id, userId, gradebookEntries),
  ).length

  return Math.round((completedCount / allActivities.length) * 100)
}
