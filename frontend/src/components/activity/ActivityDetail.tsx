import type { Activity } from '../../types/models'

interface ActivityDetailProps {
  activity: Activity | null
}

const typeCopy: Record<Activity['type'], string> = {
  video: 'Embedded video player placeholder + completion tracking.',
  coding: 'Embedded Monaco editor with multi-language support, local draft autosave, and teacher-provided starter code.',
  quiz: 'Auto-grade multiple choice + teacher-reviewed short-answer sections.',
  project: 'Project submission with files/links and teacher rubric feedback area.',
  godot: 'Launch browser Godot editor, save snapshots, and submit project state.',
}

export const ActivityDetail = ({ activity }: ActivityDetailProps) => {
  if (!activity) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        Select an activity to view details.
      </div>
    )
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
        {activity.type}
      </p>
      <h3 className="mt-3 text-xl font-semibold text-slate-900">{activity.title}</h3>
      <p className="mt-2 text-sm text-slate-600">{activity.description}</p>
      <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <p>
          <span className="font-semibold">Due:</span> {activity.dueDate}
        </p>
        <p>
          <span className="font-semibold">Points:</span> {activity.points}
        </p>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{typeCopy[activity.type]}</div>
    </article>
  )
}
