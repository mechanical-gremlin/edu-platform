import type { GradebookEntry } from '../../types/models'

interface GradebookTableProps {
  entries: GradebookEntry[]
}

export const GradebookTable = ({ entries }: GradebookTableProps) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">Activity</th>
          <th className="px-4 py-3 text-left font-semibold text-slate-600">Score</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {entries.map((entry) => (
          <tr key={`${entry.studentId}-${entry.activityId}`}>
            <td className="px-4 py-3 text-slate-700">{entry.studentName}</td>
            <td className="px-4 py-3 text-slate-700">{entry.activityTitle}</td>
            <td className="px-4 py-3 font-medium text-slate-900">
              {entry.pointsEarned}/{entry.pointsPossible}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
