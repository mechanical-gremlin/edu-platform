import { useState } from 'react'
import { GradingPanel } from '../teacher/GradingPanel'
import type { Activity, GradebookEntry, User } from '../../types/models'

interface ActivityFullScreenProps {
  activity: Activity
  allActivities: Activity[]
  currentUser: User
  gradebookEntries: GradebookEntry[]
  onClose: () => void
  onNavigate: (activityId: string) => void
  onSaveGrade?: (studentId: string, activityId: string, points: number, comment: string) => void
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

export const ActivityFullScreen = ({
  activity,
  allActivities,
  currentUser,
  gradebookEntries,
  onClose,
  onNavigate,
  onSaveGrade,
}: ActivityFullScreenProps) => {
  const [gradingOpen, setGradingOpen] = useState(false)
  const currentIndex = allActivities.findIndex((a) => a.id === activity.id)
  const prevActivity = currentIndex > 0 ? allActivities[currentIndex - 1] : null
  const nextActivity = currentIndex < allActivities.length - 1 ? allActivities[currentIndex + 1] : null

  const status = activity.statusByUser[currentUser.id] ?? 'not_started'
  const gradeEntry = gradebookEntries.find(
    (e) => e.activityId === activity.id && e.studentId === currentUser.id,
  )

  return (
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
        <div className="ml-auto flex items-center gap-4 text-sm text-slate-500">
          <span>Due: <strong className="text-slate-700">{activity.dueDate}</strong></span>
          <span>Points: <strong className="text-slate-700">{activity.points}</strong></span>
          {currentUser.role === 'teacher' && (
            <button
              onClick={() => setGradingOpen(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              ✎ Grade
            </button>
          )}
          {/* Prev/Next navigation */}
          <button
            disabled={!prevActivity}
            onClick={() => prevActivity && onNavigate(prevActivity.id)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous activity"
          >
            ‹ Prev
          </button>
          <button
            disabled={!nextActivity}
            onClick={() => nextActivity && onNavigate(nextActivity.id)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next activity"
          >
            Next ›
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col overflow-auto p-6">
        {/* Student submission status */}
        {currentUser.role === 'student' && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            {gradeEntry?.pointsEarned !== undefined && gradeEntry.pointsEarned !== null ? (
              <>
                <span className="text-lg text-emerald-500">✓</span>
                <span className="text-sm font-medium text-emerald-700">Submitted &amp; Graded</span>
                <span className="ml-2 text-sm text-slate-700">
                  <strong>{gradeEntry.pointsEarned}</strong>/{gradeEntry.pointsPossible} pts
                  {gradeEntry.pointsPossible > 0 && (
                    <span> ({Math.round((gradeEntry.pointsEarned / gradeEntry.pointsPossible) * 100)}%)</span>
                  )}
                </span>
                {gradeEntry.comment && (
                  <span className="ml-4 text-xs italic text-slate-500">"{gradeEntry.comment}"</span>
                )}
              </>
            ) : gradeEntry?.submitted ? (
              <>
                <span className="text-lg text-amber-500">⏳</span>
                <span className="text-sm font-medium text-amber-700">Submitted – awaiting grade</span>
              </>
            ) : status === 'completed' ? (
              <>
                <span className="text-lg text-indigo-500">✓</span>
                <span className="text-sm font-medium text-indigo-700">Completed</span>
              </>
            ) : status === 'in_progress' ? (
              <>
                <span className="text-lg text-slate-400">✎</span>
                <span className="text-sm font-medium text-slate-600">In Progress</span>
              </>
            ) : (
              <span className="text-sm text-slate-500">Not yet submitted</span>
            )}
          </div>
        )}

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

      {/* Grading panel for teachers */}
      {currentUser.role === 'teacher' && gradingOpen && (
        <GradingPanel
          activityId={activity.id}
          activityTitle={activity.title}
          entries={gradebookEntries}
          onClose={() => setGradingOpen(false)}
          onSave={(studentId, points, comment) => {
            onSaveGrade?.(studentId, activity.id, points, comment)
          }}
        />
      )}
    </div>
  )
}

