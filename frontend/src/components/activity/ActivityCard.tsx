import type { Activity } from '../../types/models'

interface ActivityCardProps {
  activity: Activity
  onSelect: (activityId: string) => void
}

export const ActivityCard = ({ activity, onSelect }: ActivityCardProps) => (
  <button className="text-left text-sm text-slate-700" onClick={() => onSelect(activity.id)}>
    <span className="mr-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs uppercase text-indigo-700">
      {activity.type}
    </span>
    {activity.title}
  </button>
)
