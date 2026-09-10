import type { GradebookEntry } from '../../types/models'

interface GradebookTableProps {
  entries: GradebookEntry[]
  onStudentClick?: (studentId: string) => void
  onActivityClick?: (activityId: string) => void
}

export const GradebookTable = ({ entries, onStudentClick, onActivityClick }: GradebookTableProps) => {
  // Build unique students and activities
  const studentMap = new Map<string, string>()
  const activityMap = new Map<string, string>()

  for (const e of entries) {
    studentMap.set(e.studentId, e.studentName)
    activityMap.set(e.activityId, e.activityTitle)
  }

  const students = Array.from(studentMap.entries()) // [id, name]
  const activities = Array.from(activityMap.entries()) // [id, title]

  // Build lookup: studentId -> activityId -> entry
  const lookup = new Map<string, Map<string, GradebookEntry>>()
  for (const e of entries) {
    if (!lookup.has(e.studentId)) lookup.set(e.studentId, new Map())
    lookup.get(e.studentId)!.set(e.activityId, e)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-max text-sm">
          <thead className="bg-slate-50">
            <tr>
              {/* Frozen student column header */}
              <th className="sticky left-0 z-10 min-w-[180px] bg-slate-50 px-4 py-3 text-left font-semibold text-slate-600 shadow-[2px_0_0_0_#e2e8f0]">
                Student
              </th>
              {activities.map(([activityId, title]) => (
                <th
                  key={activityId}
                  className="min-w-[160px] px-4 py-3 text-left font-semibold text-slate-600"
                >
                  <button
                    className="text-left hover:text-indigo-600 hover:underline"
                    onClick={() => onActivityClick?.(activityId)}
                    title="View assignment"
                  >
                    {title}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map(([studentId, studentName]) => (
              <tr key={studentId} className="hover:bg-slate-50">
                {/* Frozen student name cell */}
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-800 shadow-[2px_0_0_0_#e2e8f0]">
                  <button
                    className="text-left hover:text-indigo-600 hover:underline"
                    onClick={() => onStudentClick?.(studentId)}
                  >
                    {studentName}
                  </button>
                </td>
                {activities.map(([activityId]) => {
                  const entry = lookup.get(studentId)?.get(activityId)
                  return (
                    <td key={activityId} className="px-4 py-3 text-slate-700">
                      {entry ? (
                        entry.pointsEarned === null && entry.submitted ? (
                          // Submitted but not graded
                          <span
                            title="Submitted – awaiting grade"
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          >
                            ✓ Submitted
                          </span>
                        ) : entry.pointsEarned !== null ? (
                          <button
                            className="rounded px-1 hover:text-indigo-600 hover:underline"
                            onClick={() => onActivityClick?.(activityId)}
                            title="View submission"
                          >
                            <span className="font-semibold text-slate-900">{entry.pointsEarned}</span>
                            <span className="text-slate-400">/{entry.pointsPossible}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

