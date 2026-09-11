import { useEffect, useMemo, useState } from 'react'
import { GradingPanel } from '../teacher/GradingPanel'
import type { Activity, GradebookEntry, User } from '../../types/models'

interface ActivityFullScreenProps {
  activity: Activity
  allActivities: Activity[]
  currentUser: User
  gradebookEntries: GradebookEntry[]
  onClose: () => void
  onNavigate: (activityId: string) => void
  onSaveGrade?: (studentId: string, activityId: string, points: number, comment: string) => Promise<void>
  onSubmitActivity?: (activityId: string, responseText: string) => Promise<void>
}

const typeCopy: Record<Activity['type'], string> = {
  video: 'Use the embedded player or launch the demo link, then submit a short reflection.',
  coding: 'Work in the linked coding sandbox and submit a share link or pasted solution.',
  quiz: 'Respond in the workspace below and submit when complete.',
  project: 'Use the linked tool or your own workspace, then submit a summary or share link.',
  godot: 'Launch the browser Godot editor and submit the project link or build notes.',
}

const typeIcon: Record<Activity['type'], string> = {
  video: '▶',
  coding: '{ }',
  quiz: '✓',
  project: '📁',
  godot: '🎮',
}

const getEmbeddedUrl = (activity: Activity) => {
  const resourceUrl = activity.resourceUrl?.trim()
  if (!resourceUrl) return null

  if (resourceUrl.includes('youtube.com/watch?v=')) {
    const videoId = new URL(resourceUrl).searchParams.get('v')
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null
  }

  if (resourceUrl.includes('youtu.be/')) {
    const videoId = resourceUrl.split('youtu.be/')[1]?.split(/[?&]/)[0]
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null
  }

  const googleDriveMatch = resourceUrl.match(/\/d\/([^/]+)/)
  if (googleDriveMatch) {
    return `https://drive.google.com/file/d/${googleDriveMatch[1]}/preview`
  }

  if (
    resourceUrl.includes('stackblitz.com/') ||
    resourceUrl.includes('editor.godotengine.org/') ||
    resourceUrl.includes('canva.com/')
  ) {
    return resourceUrl
  }

  return null
}

export const ActivityFullScreen = ({
  activity,
  allActivities,
  currentUser,
  gradebookEntries,
  onClose,
  onNavigate,
  onSaveGrade,
  onSubmitActivity,
}: ActivityFullScreenProps) => {
  const [gradingOpen, setGradingOpen] = useState(false)
  const [directionsOpen, setDirectionsOpen] = useState(Boolean(activity.directions))
  const [submissionText, setSubmissionText] = useState('')
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const currentIndex = allActivities.findIndex((currentActivity) => currentActivity.id === activity.id)
  const prevActivity = currentIndex > 0 ? allActivities[currentIndex - 1] : null
  const nextActivity = currentIndex < allActivities.length - 1 ? allActivities[currentIndex + 1] : null
  const gradeEntry = gradebookEntries.find(
    (entry) => entry.activityId === activity.id && entry.studentId === currentUser.id,
  )

  useEffect(() => {
    setDirectionsOpen(Boolean(activity.directions))
    setSubmissionText(gradeEntry?.submissionText ?? '')
    setSubmissionError(null)
  }, [activity.directions, activity.id, gradeEntry?.submissionText])

  const isGraded = gradeEntry?.pointsEarned !== null && gradeEntry?.pointsEarned !== undefined
  const isSubmitted = Boolean(gradeEntry?.submitted)
  const embeddedUrl = useMemo(() => getEmbeddedUrl(activity), [activity])

  const renderWorkspace = () => {
    if (embeddedUrl) {
      return (
        <iframe
          src={embeddedUrl}
          title={`${activity.title} workspace`}
          className="h-[65vh] w-full rounded-2xl border border-slate-200 bg-white"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )
    }

    return (
      <div className="flex h-[65vh] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
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
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
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
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            onClick={() => setDirectionsOpen((value) => !value)}
          >
            {directionsOpen ? 'Hide Directions' : 'Show Directions'}
          </button>
          <span>
            Due: <strong className="text-slate-700">{activity.dueDate || 'No due date'}</strong>
          </span>
          <span>
            Points: <strong className="text-slate-700">{activity.points}</strong>
          </span>
          {currentUser.role === 'teacher' && (
            <button
              onClick={() => setGradingOpen(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              ✎ Grade
            </button>
          )}
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

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
        {currentUser.role === 'student' && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            {isGraded ? (
              <>
                <span className="text-lg text-emerald-500">✓</span>
                <span className="text-sm font-medium text-emerald-700">Submitted &amp; Graded</span>
                <span className="ml-2 text-sm text-slate-700">
                  <strong>{gradeEntry?.pointsEarned}</strong>/{gradeEntry?.pointsPossible} pts
                </span>
                {gradeEntry?.comment && (
                  <span className="ml-4 text-xs italic text-slate-500">"{gradeEntry.comment}"</span>
                )}
              </>
            ) : isSubmitted ? (
              <>
                <span className="text-lg text-amber-500">⏳</span>
                <span className="text-sm font-medium text-amber-700">Submitted – awaiting grade</span>
              </>
            ) : (
              <span className="text-sm text-slate-500">Not yet submitted</span>
            )}
          </div>
        )}

        {directionsOpen && (
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Directions</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {activity.directions?.trim() || 'No directions were added for this activity yet.'}
            </p>
          </section>
        )}

        <p className="max-w-3xl text-sm text-slate-600">{activity.description}</p>

        {renderWorkspace()}

        {currentUser.role === 'student' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Student Submission</h2>
                <p className="text-sm text-slate-500">
                  Add a reflection, answer, or share link for the teacher to review.
                </p>
              </div>
              {activity.resourceUrl && (
                <a
                  href={activity.resourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Launch Resource ↗
                </a>
              )}
            </div>
            <textarea
              className="mt-4 h-32 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Paste a share link, write your answer, or describe your work..."
              value={submissionText}
              onChange={(event) => setSubmissionText(event.target.value)}
            />
            {submissionError && <p className="mt-2 text-sm text-rose-600">{submissionError}</p>}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {gradeEntry?.submittedAt
                  ? `Last submitted ${gradeEntry.submittedAt.slice(0, 10)}`
                  : 'Not submitted yet'}
              </p>
              <button
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                disabled={submitting || submissionText.trim().length === 0}
                onClick={async () => {
                  try {
                    setSubmitting(true)
                    setSubmissionError(null)
                    await onSubmitActivity?.(activity.id, submissionText.trim())
                  } catch (saveError) {
                    setSubmissionError(
                      saveError instanceof Error ? saveError.message : 'Failed to submit activity',
                    )
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                {submitting ? 'Submitting…' : isSubmitted ? 'Update submission' : 'Submit activity'}
              </button>
            </div>
          </section>
        )}
      </div>

      {currentUser.role === 'teacher' && gradingOpen && (
        <GradingPanel
          activityId={activity.id}
          activityTitle={activity.title}
          entries={gradebookEntries}
          onClose={() => setGradingOpen(false)}
          onSave={async (studentId, points, comment) => {
            await onSaveGrade?.(studentId, activity.id, points, comment)
          }}
        />
      )}
    </div>
  )
}
