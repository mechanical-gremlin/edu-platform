import { useMemo, useState } from 'react'
import { GradebookTable } from '../components/gradebook/GradebookTable'
import { GradingPanel } from '../components/teacher/GradingPanel'
import type { Course, GradebookEntry, User } from '../types/models'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

interface GradebookPageProps {
  entries: GradebookEntry[]
  courses: Course[]
  user: User
  onSaveGrade?: (studentId: string, activityId: string, points: number, comment: string) => Promise<void>
}

export const GradebookPage = ({ entries, courses, user, onSaveGrade }: GradebookPageProps) => {
  const isTeacher = user.role === 'teacher'
  const [gradingActivityId, setGradingActivityId] = useState<string | null>(null)
  const courseOptions = useMemo(
    () =>
      courses
        .filter((course) => entries.some((entry) => entry.courseId === course.id))
        .map((course) => ({
          id: course.id,
          label: `${course.code} · ${course.title}`,
        })),
    [courses, entries],
  )
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all')
  const activeCourseId =
    !isTeacher || selectedCourseId === 'all' || courseOptions.some((course) => course.id === selectedCourseId)
      ? selectedCourseId
      : 'all'

  const visibleEntries = isTeacher
    ? activeCourseId === 'all'
      ? entries
      : entries.filter((entry) => entry.courseId === activeCourseId)
    : entries.filter((entry) => entry.studentId === user.id)
  const activeGradingActivityId =
    gradingActivityId && visibleEntries.some((entry) => entry.activityId === gradingActivityId)
      ? gradingActivityId
      : null
  const gradingActivity = useMemo(() => {
    if (!activeGradingActivityId) return null

    for (const course of courses) {
      for (const unit of course.units) {
        for (const lesson of unit.lessons) {
          const activity = lesson.activities.find((item) => item.id === activeGradingActivityId)
          if (activity) {
            return activity
          }
        }
      }
    }

    return null
  }, [activeGradingActivityId, courses])

  if (!isTeacher) {
    const gradedEntries = visibleEntries.filter((entry) => entry.pointsEarned !== null)
    const totalEarned = gradedEntries.reduce((sum, entry) => sum + (entry.pointsEarned ?? 0), 0)
    const totalPossible = gradedEntries.reduce((sum, entry) => sum + entry.pointsPossible, 0)
    const overallPct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null

    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">My Grades</h2>
        {overallPct !== null && (
          <p className="text-sm text-slate-600">
            Overall grade: <span className="font-semibold text-indigo-600">{overallPct}%</span> ({totalEarned} /{' '}
            {totalPossible} graded pts)
          </p>
        )}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Assignment</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Score</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEntries.map((entry) => {
                  const pct =
                    entry.pointsEarned !== null && entry.pointsPossible > 0
                      ? Math.round((entry.pointsEarned / entry.pointsPossible) * 100)
                      : null
                  return (
                    <tr key={`${entry.activityId}-${entry.studentId}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{entry.activityTitle}</td>
                      <td className="px-4 py-3 text-slate-500">{entry.courseCode ?? entry.courseId}</td>
                      <td className="px-4 py-3">
                        {entry.pointsEarned !== null ? (
                          <span>
                            <span className="font-semibold text-slate-900">{entry.pointsEarned}</span>
                            <span className="text-slate-400">/{entry.pointsPossible}</span>
                            {pct !== null && <span className="ml-2 text-xs text-slate-500">({pct}%)</span>}
                          </span>
                        ) : entry.submitted ? (
                          <span className="text-xs text-amber-600">Submitted – pending</span>
                        ) : (
                          <span className="text-slate-400">Not graded yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.pointsEarned !== null ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            ✓ Graded
                          </span>
                        ) : entry.submitted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            ⏳ Submitted
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Awaiting submission</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs italic text-slate-600">{entry.comment ?? '—'}</td>
                    </tr>
                  )
                })}
                {visibleEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                      No grades posted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gradebook</h2>
          <p className="text-sm text-slate-600">Click an assignment column to enter grade mode.</p>
        </div>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Class</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            value={activeCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value)}
          >
            <option value="all">All classes</option>
            {courseOptions.map((course) => (
              <option key={course.id} value={course.id}>
                {course.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <GradebookTable
        entries={visibleEntries}
        onActivityClick={(activityId) => {
          const entry = visibleEntries.find((gradebookEntry) => gradebookEntry.activityId === activityId)
          if (entry) setGradingActivityId(activityId)
        }}
      />
      {activeGradingActivityId && (
        <GradingPanel
          activityId={activeGradingActivityId}
          activityTitle={
            visibleEntries.find((entry) => entry.activityId === activeGradingActivityId)?.activityTitle ?? ''
          }
          activityType={gradingActivity?.type ?? 'project'}
          activityLanguage={gradingActivity?.language}
          entries={visibleEntries}
          executeUrl={apiBaseUrl ? `${apiBaseUrl}/execute` : undefined}
          runUserId={user.id}
          onClose={() => setGradingActivityId(null)}
          onSave={async (studentId, points, comment) => {
            await onSaveGrade?.(studentId, activeGradingActivityId, points, comment)
          }}
        />
      )}
    </section>
  )
}
