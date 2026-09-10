import type { Activity } from '../../types/models'

interface ActivityFullScreenProps {
  activity: Activity
  onClose: () => void
}

const typeCopy: Record<Activity['type'], string> = {
  video: 'Embedded video player placeholder + completion tracking.',
  coding: 'Code editor placeholder with run/submit controls and autograder preview.',
  quiz: 'Auto-grade multiple choice + teacher-reviewed short-answer sections.',
  project: 'Project submission with files/links and teacher rubric feedback area.',
  godot: 'Launch browser Godot editor, save snapshots, and submit project state.',
}

const typeIcon: Record<Activity['type'], string> = {
  video: '▶',
  coding: '{ }',
  quiz: '✓',
  project: '📁',
  godot: '🎮',
}

export const ActivityFullScreen = ({ activity, onClose }: ActivityFullScreenProps) => (
  <div className="fixed inset-0 z-50 flex flex-col bg-white">
    {/* Header bar */}
    <header className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3">
      <button
        onClick={onClose}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
        aria-label="Close activity"
      >
        ← Back
      </button>
      <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
        {typeIcon[activity.type]} {activity.type}
      </span>
      <h1 className="text-base font-semibold text-slate-900 sm:text-lg">{activity.title}</h1>
      <div className="ml-auto flex gap-4 text-sm text-slate-500">
        <span>Due: <strong className="text-slate-700">{activity.dueDate}</strong></span>
        <span>Points: <strong className="text-slate-700">{activity.points}</strong></span>
      </div>
    </header>

    {/* Body */}
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <p className="mb-6 max-w-3xl text-sm text-slate-600">{activity.description}</p>

      {/* Workspace placeholder */}
      <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div>
          <p className="text-5xl">{typeIcon[activity.type]}</p>
          <p className="mt-4 text-base font-medium text-slate-700">{typeCopy[activity.type]}</p>
          {activity.resourceUrl && (
            <a
              href={activity.resourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Open Resource ↗
            </a>
          )}
        </div>
      </div>
    </div>
  </div>
)
