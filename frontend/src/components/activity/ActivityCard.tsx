import type { Activity, GradebookEntry } from '../../types/models'

interface ActivityCardProps {
  activity: Activity
  currentUserId: string
  isTeacher?: boolean
  gradebookEntries?: GradebookEntry[]
  onSelect: (activityId: string) => void
}

export const ActivityCard = ({
  activity,
  currentUserId,
  isTeacher = false,
  gradebookEntries = [],
  onSelect,
}: ActivityCardProps) => {
  const gradeEntry = gradebookEntries.find(
    (entry) => entry.activityId === activity.id && entry.studentId === currentUserId,
  )
  const isGraded = gradeEntry?.pointsEarned !== null && gradeEntry?.pointsEarned !== undefined
  const isSubmitted = !!gradeEntry?.submitted && !isGraded
  const today = new Date().toLocaleDateString('en-CA')
  const isOverdue = !isTeacher && !!activity.dueDate && activity.dueDate < today && !isSubmitted && !isGraded

  let rowClass = 'flex w-full items-center gap-2 text-left text-sm'
  if (!isTeacher) {
    if (isGraded) rowClass += ' text-emerald-700'
    else if (isSubmitted) rowClass += ' text-amber-700'
    else if (isOverdue) rowClass += ' text-red-700'
    else rowClass += ' text-slate-700'
  } else {
    rowClass += ' text-slate-700'
  }

  return (
    <button className={rowClass} onClick={() => onSelect(activity.id)}>
      <span className="mr-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs uppercase text-indigo-700">
        {activity.type}
      </span>
      <span className="flex-1">{activity.title}</span>
      {!isTeacher && isOverdue && (
        <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
          Late
        </span>
      )}
      {isSubmitted && (
        <span className="ml-1 text-emerald-500" title="Submitted">
          ✓
        </span>
      )}
      {isGraded && gradeEntry && (
        <span className="ml-1 text-xs font-semibold text-slate-600">
          {gradeEntry.pointsEarned}/{gradeEntry.pointsPossible}
        </span>
      )}
    </button>
  )
}
