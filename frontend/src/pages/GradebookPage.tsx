import { useState } from 'react'
import { GradebookTable } from '../components/gradebook/GradebookTable'
import { GradingPanel } from '../components/teacher/GradingPanel'
import type { GradebookEntry, User } from '../types/models'

interface GradebookPageProps {
  entries: GradebookEntry[]
  user: User
  onSaveGrade?: (studentId: string, activityId: string, points: number, comment: string) => Promise<void>
}

export const GradebookPage = ({ entries, user, onSaveGrade }: GradebookPageProps) => {
  const isTeacher = user.role === 'teacher'
  const [gradingActivityId, setGradingActivityId] = useState<string | null>(null)

  const visibleEntries = isTeacher ? entries : entries.filter((entry) => entry.studentId === user.id)

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
          <table className="min-w-full text-sm">
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
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Gradebook</h2>
      <p className="text-sm text-slate-600">Click an assignment column to enter grade mode.</p>
      <GradebookTable
        entries={visibleEntries}
        onActivityClick={(activityId) => {
          const entry = visibleEntries.find((gradebookEntry) => gradebookEntry.activityId === activityId)
          if (entry) setGradingActivityId(activityId)
        }}
      />
      {gradingActivityId && (
        <GradingPanel
          activityId={gradingActivityId}
          activityTitle={visibleEntries.find((entry) => entry.activityId === gradingActivityId)?.activityTitle ?? ''}
          entries={visibleEntries}
          onClose={() => setGradingActivityId(null)}
          onSave={async (studentId, points, comment) => {
            await onSaveGrade?.(studentId, gradingActivityId, points, comment)
          }}
        />
      )}
    </section>
  )
}
