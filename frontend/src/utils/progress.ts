import type { Activity, Course } from '../types/models'

const isComplete = (activity: Activity, userId: string) => activity.statusByUser[userId] === 'completed'

export const getCourseProgress = (course: Course, userId: string): number => {
  const allActivities = course.units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.activities))

  if (allActivities.length === 0) {
    return 0
  }

  const completedCount = allActivities.filter((activity) => isComplete(activity, userId)).length

  return Math.round((completedCount / allActivities.length) * 100)
}
