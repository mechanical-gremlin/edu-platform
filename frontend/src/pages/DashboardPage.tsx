import { getCourseProgress } from '../utils/progress'
import type { Course, User } from '../types/models'

interface DashboardPageProps {
  user: User
  courses: Course[]
  onCourseOpen: (courseId: string) => void
}

const today = new Date().toISOString().slice(0, 10)

export const DashboardPage = ({ user, courses, onCourseOpen }: DashboardPageProps) => {
  // Gather all activities across all courses with context
  const allActivities = courses.flatMap((course) =>
    course.units.flatMap((unit) =>
      unit.lessons.flatMap((lesson) =>
        lesson.activities.map((activity) => ({ activity, course })),
      ),
    ),
  )

  const upcoming = allActivities.filter(
    ({ activity }) =>
      activity.dueDate >= today &&
      (activity.statusByUser[user.id] ?? 'not_started') !== 'completed',
  )

  const late = allActivities.filter(
    ({ activity }) =>
      activity.dueDate < today &&
      (activity.statusByUser[user.id] ?? 'not_started') !== 'completed',
  )

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
            return (
              <button
                key={course.id}
                className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                onClick={() => onCourseOpen(course.id)}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{course.code}</p>
                <h4 className="mt-1 text-base font-semibold text-slate-900">{course.title}</h4>
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

