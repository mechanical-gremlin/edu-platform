import { getCourseProgress } from '../utils/progress'
import type { Course, GradebookEntry, User } from '../types/models'

interface DashboardPageProps {
  user: User
  courses: Course[]
  gradebookEntries: GradebookEntry[]
  onCourseOpen: (courseId: string) => void
}

export const DashboardPage = ({ user, courses, gradebookEntries, onCourseOpen }: DashboardPageProps) => {
  const today = new Date().toISOString().slice(0, 10)
  // Gather all activities across all courses with context
  const allActivities = courses.flatMap((course) =>
    course.units.flatMap((unit) =>
      unit.lessons.flatMap((lesson) =>
        lesson.activities.map((activity) => ({ activity, course })),
      ),
    ),
  )

  const upcoming = allActivities
    .filter(
      ({ activity }) =>
        activity.dueDate >= today &&
        (activity.statusByUser[user.id] ?? 'not_started') !== 'completed',
    )
    .sort((a, b) => a.activity.dueDate.localeCompare(b.activity.dueDate))

  const late = allActivities
    .filter(
      ({ activity }) =>
        activity.dueDate < today &&
        (activity.statusByUser[user.id] ?? 'not_started') !== 'completed',
    )
    .sort((a, b) => a.activity.dueDate.localeCompare(b.activity.dueDate))

  // Compute grade percentage per course for the current user (student)
  const getCourseGradePct = (courseId: string): number | null => {
    if (user.role !== 'student') return null
    const entries = gradebookEntries.filter(
      (e) => e.studentId === user.id && e.courseId === courseId && e.pointsEarned !== null,
    )
    if (entries.length === 0) return null
    const earned = entries.reduce((sum, e) => sum + (e.pointsEarned ?? 0), 0)
    const possible = entries.reduce((sum, e) => sum + e.pointsPossible, 0)
    return possible > 0 ? Math.round((earned / possible) * 100) : null
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {user.role === 'teacher' ? 'Teacher' : 'Student'} Dashboard
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Welcome back, {user.name}. Here's your overview.
        </p>
      </div>

      {/* Course Grade Summary */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-800">Course Grades</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const progress = getCourseProgress(course, user.id)
            const gradePct = getCourseGradePct(course.id)
            return (
              <button
                key={course.id}
                className="relative w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                onClick={() => onCourseOpen(course.id)}
              >
                {gradePct !== null && (
                  <span className="absolute right-4 top-4 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                    {gradePct}%
                  </span>
                )}
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{course.code}</p>
                <h4 className="mt-1 text-base font-semibold text-slate-900 pr-14">{course.title}</h4>
                <p className="mt-1 text-sm text-slate-600">Instructor: {course.teacherName}</p>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Overall Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Upcoming Assignments */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-800">Upcoming Assignments</h3>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No upcoming assignments. Great job staying on top of things!
          </p>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {upcoming.map(({ activity, course }) => (
              <div
                key={activity.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-900">{activity.title}</span>
                  <span className="ml-2 text-xs text-slate-500">{course.code}</span>
                </div>
                <span className="text-xs text-slate-500">Due {activity.dueDate}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Late Assignments */}
      {late.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-red-700">Late / Missing Assignments</h3>
          <div className="divide-y divide-red-50 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            {late.map(({ activity, course }) => (
              <div
                key={activity.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-900">{activity.title}</span>
                  <span className="ml-2 text-xs text-slate-500">{course.code}</span>
                </div>
                <span className="text-xs font-semibold text-red-600">Due {activity.dueDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}


