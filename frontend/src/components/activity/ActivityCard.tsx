import type { Activity, GradebookEntry } from '../../types/models'

interface ActivityCardProps {
  activity: Activity
  currentUserId: string
  gradebookEntries?: GradebookEntry[]
  onSelect: (activityId: string) => void
}

export const ActivityCard = ({ activity, currentUserId, gradebookEntries = [], onSelect }: ActivityCardProps) => {
  const status = activity.statusByUser[currentUserId] ?? 'not_started'
  const gradeEntry = gradebookEntries.find(
    (e) => e.activityId === activity.id && e.studentId === currentUserId,
  )
  const isSubmitted = gradeEntry?.submitted || status === 'completed'
  const isGraded = gradeEntry?.pointsEarned !== null && gradeEntry?.pointsEarned !== undefined

  return (
    <button className="flex w-full items-center gap-2 text-left text-sm text-slate-700" onClick={() => onSelect(activity.id)}>
      <span className="mr-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs uppercase text-indigo-700">
        {activity.type}
      </span>
      <span className="flex-1">{activity.title}</span>
      {isSubmitted && (
        <span className="ml-1 text-emerald-500" title="Submitted">✓</span>
      )}
      {isGraded && gradeEntry && (
        <span className="ml-1 text-xs font-semibold text-slate-600">
          {gradeEntry.pointsEarned}/{gradeEntry.pointsPossible}
        </span>
      )}
    </button>
  )
}

