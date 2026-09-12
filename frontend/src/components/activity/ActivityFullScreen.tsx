import { useEffect, useMemo, useState } from 'react'
import { GradingPanel } from '../teacher/GradingPanel'
import { DirectionsEditor } from '../teacher/DirectionsEditor'
import { MonacoEditor } from '../coding/MonacoEditor'
import { WebProjectEditor } from '../coding/WebProjectEditor'
import type { Activity, GradebookEntry, StarterFile, UpdateActivityDirectionsInput, User } from '../../types/models'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

interface ActivityFullScreenProps {
  activity: Activity
  allActivities: Activity[]
  currentUser: User
  gradebookEntries: GradebookEntry[]
  onClose: () => void
  onNavigate: (activityId: string) => void
  onSaveGrade?: (studentId: string, activityId: string, points: number, comment: string) => Promise<void>
  onSubmitActivity?: (activityId: string, responseText: string, submissionFiles?: StarterFile[] | null) => Promise<void>
  onUpdateActivityDirections?: (
    activityId: string,
    input: UpdateActivityDirectionsInput,
  ) => Promise<void>
}

const typeCopy: Record<Activity['type'], string> = {
  video: 'Use the embedded player or launch the demo link, then submit a short reflection.',
  coding: 'Write and run your code in the embedded editor below. When finished, copy your code into the submission box and submit.',
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

const demoWorkspaceUrls: Record<Activity['type'], string | null> = {
  video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  coding: 'https://onecompiler.com/embed/javascript?theme=dark&hideLanguageSelection=false',
  quiz: null,
  project: 'https://onecompiler.com/embed/javascript?theme=dark',
  godot: 'https://editor.godotengine.org/releases/latest/',
}

const getEmbeddedUrl = (activity: Activity) => {
  const rawUrl = activity.resourceUrl?.trim() || demoWorkspaceUrls[activity.type]
  if (!rawUrl) return null

  if (activity.type === 'godot') {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }

  if (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') {
    const videoId = parsed.searchParams.get('v')
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null
  }

  if (parsed.hostname === 'youtu.be') {
    const videoId = parsed.pathname.slice(1).split('?')[0]
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null
  }

  if (parsed.hostname === 'drive.google.com') {
    const driveMatch = parsed.pathname.match(/\/d\/([^/]+)/)
    return driveMatch ? `https://drive.google.com/file/d/${driveMatch[1]}/preview` : null
  }

  const allowedEmbedHosts = [
    'onecompiler.com',
    'stackblitz.com',
    'editor.godotengine.org',
    'canva.com',
  ]

  if (allowedEmbedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
    return rawUrl
  }

  return null
}

const getLaunchUrl = (activity: Activity) => activity.resourceUrl?.trim() || demoWorkspaceUrls[activity.type]

export const ActivityFullScreen = ({
  activity,
  allActivities,
  currentUser,
  gradebookEntries,
  onClose,
  onNavigate,
  onSaveGrade,
  onSubmitActivity,
  onUpdateActivityDirections,
}: ActivityFullScreenProps) => {
  const [gradingOpen, setGradingOpen] = useState(false)
  const [directionsOpen, setDirectionsOpen] = useState(
    Boolean(activity.directions) || currentUser.role === 'teacher',
  )
  const [editingDirections, setEditingDirections] = useState(false)
  const [directionsDraft, setDirectionsDraft] = useState(activity.directions ?? '')
  const [directionsError, setDirectionsError] = useState<string | null>(null)
  const [savingDirections, setSavingDirections] = useState(false)
  const [submissionText, setSubmissionText] = useState('')
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [monacoLanguage, setMonacoLanguage] = useState(activity.language ?? 'javascript')
  const [monacoCode, setMonacoCode] = useState(activity.starterCode ?? '')
  const [webFiles, setWebFiles] = useState<StarterFile[]>(activity.starterFiles ?? [])
  const currentIndex = allActivities.findIndex((currentActivity) => currentActivity.id === activity.id)
  const prevActivity = currentIndex > 0 ? allActivities[currentIndex - 1] : null
  const nextActivity = currentIndex < allActivities.length - 1 ? allActivities[currentIndex + 1] : null
  const gradeEntry = gradebookEntries.find(
    (entry) => entry.activityId === activity.id && entry.studentId === currentUser.id,
  )

  useEffect(() => {
    setDirectionsOpen(Boolean(activity.directions) || currentUser.role === 'teacher')
    setEditingDirections(false)
    setDirectionsDraft(activity.directions ?? '')
    setDirectionsError(null)
    setSubmissionText(gradeEntry?.submissionText ?? '')
    setSubmissionError(null)
    setMonacoLanguage(activity.language ?? 'javascript')
    setMonacoCode(activity.starterCode ?? '')
    setWebFiles(activity.starterFiles ?? [])
  }, [activity.directions, activity.id, activity.language, activity.starterCode, activity.starterFiles, currentUser.role, gradeEntry?.submissionText])

  const isGraded = gradeEntry?.pointsEarned !== null && gradeEntry?.pointsEarned !== undefined
  const isSubmitted = Boolean(gradeEntry?.submitted)
  const embeddedUrl = useMemo(() => getEmbeddedUrl(activity), [activity])
  const launchUrl = useMemo(() => getLaunchUrl(activity), [activity])
  const languageLockedForStudents = Boolean(activity.languageLocked && activity.language)

  const renderWorkspace = () => {
    if (activity.type === 'coding') {
      const isWeb = activity.language === 'web'

      if (isWeb) {
        return (
          <WebProjectEditor
            key={activity.id}
            defaultFiles={activity.starterFiles ?? null}
            onChange={(files) => {
              setWebFiles(files)
              if (currentUser.role === 'student') {
                setSubmissionText(JSON.stringify(files))
              }
            }}
            readOnly={false}
            height="500px"
          />
        )
      }

      return (
        <MonacoEditor
          key={activity.id}
          defaultValue={activity.starterCode ?? ''}
          language={monacoLanguage}
          showLanguageSelector={currentUser.role === 'teacher' || !languageLockedForStudents}
          onLanguageChange={setMonacoLanguage}
          onChange={(code) => {
            setMonacoCode(code)
            if (currentUser.role === 'student') {
              setSubmissionText(code)
            }
          }}
          executeUrl={apiBaseUrl ? `${apiBaseUrl}/execute` : undefined}
          userId={currentUser.id}
          expectedOutput={activity.expectedOutput}
          minHeight="500px"
        />
      )
    }

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
          {activity.type === 'godot' && (
            <p className="mt-2 text-xs text-amber-600">
              ⚠ In-browser Godot embedding is under investigation for a future release. Use the button below to open the editor in a new window.
            </p>
          )}
          {launchUrl && (
            <a
              href={launchUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {activity.type === 'godot' ? 'Open Godot Editor ↗' : 'Open Resource ↗'}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Directions</h2>
              {currentUser.role === 'teacher' && (
                <div className="flex items-center gap-2">
                  {editingDirections ? (
                    <>
                      <button
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        onClick={() => {
                          setEditingDirections(false)
                          setDirectionsDraft(activity.directions ?? '')
                          setDirectionsError(null)
                        }}
                        disabled={savingDirections}
                      >
                        Cancel
                      </button>
                      <button
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        onClick={async () => {
                          try {
                            setSavingDirections(true)
                            setDirectionsError(null)
                            await onUpdateActivityDirections?.(activity.id, {
                              directions: directionsDraft.trim() || null,
                            })
                            setEditingDirections(false)
                          } catch (saveError) {
                            setDirectionsError(
                              saveError instanceof Error
                                ? saveError.message
                                : 'Failed to update directions',
                            )
                          } finally {
                            setSavingDirections(false)
                          }
                        }}
                        disabled={savingDirections}
                      >
                        {savingDirections ? 'Saving…' : 'Save Directions'}
                      </button>
                    </>
                  ) : (
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      onClick={() => setEditingDirections(true)}
                    >
                      Edit Directions
                    </button>
                  )}
                </div>
              )}
            </div>
            {editingDirections ? (
              <div className="mt-3">
                <DirectionsEditor
                  value={directionsDraft}
                  onChange={setDirectionsDraft}
                  minHeightClassName="h-40"
                />
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {activity.directions?.trim() || 'No directions were added for this activity yet.'}
              </p>
            )}
            {directionsError && <p className="mt-3 text-sm text-rose-600">{directionsError}</p>}
          </section>
        )}

        <p className="max-w-3xl whitespace-pre-wrap text-sm text-slate-600">{activity.description}</p>

        {renderWorkspace()}
        {launchUrl && embeddedUrl && (
          <p className="-mt-1 text-xs text-slate-500">
            If the embedded tool is blocked on your network, use{' '}
            <a
              href={launchUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 hover:underline"
            >
              Open Resource ↗
            </a>
            .
          </p>
        )}

        {currentUser.role === 'student' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Student Submission</h2>
                <p className="text-sm text-slate-500">
                  {activity.type === 'coding'
                    ? 'Your current code in the editor will be saved when you submit.'
                    : 'Add a reflection, answer, or share link for the teacher to review.'}
                </p>
              </div>
              {launchUrl && activity.type !== 'coding' && (
                <a
                  href={launchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Launch Resource ↗
                </a>
              )}
            </div>
            {activity.type !== 'coding' && (
              <textarea
                className="mt-4 h-32 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Paste a share link, write your answer, or describe your work..."
                value={submissionText}
                onChange={(event) => setSubmissionText(event.target.value)}
              />
            )}
            {activity.type === 'coding' && (
              <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                ✓ Your code from the editor above will be submitted automatically.
              </p>
            )}
            {submissionError && <p className="mt-2 text-sm text-rose-600">{submissionError}</p>}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {gradeEntry?.submittedAt
                  ? `Last submitted ${gradeEntry.submittedAt.slice(0, 10)}`
                  : 'Not submitted yet'}
              </p>
              <button
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                disabled={submitting || (activity.type === 'coding'
                  ? (activity.language === 'web' ? webFiles.length === 0 : monacoCode.trim().length === 0)
                  : submissionText.trim().length === 0)}
                onClick={async () => {
                  try {
                    setSubmitting(true)
                    setSubmissionError(null)
                    let textToSubmit: string
                    if (activity.type === 'coding') {
                      textToSubmit = activity.language === 'web'
                        ? JSON.stringify(webFiles)
                        : monacoCode
                    } else {
                      textToSubmit = submissionText.trim()
                    }
                    await onSubmitActivity?.(
                      activity.id,
                      textToSubmit,
                      activity.type === 'coding' && activity.language === 'web' ? webFiles : null,
                    )
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
          activityType={activity.type}
          activityLanguage={activity.language}
          entries={gradebookEntries}
          executeUrl={apiBaseUrl ? `${apiBaseUrl}/execute` : undefined}
          runUserId={currentUser.id}
          onClose={() => setGradingOpen(false)}
          onSave={async (studentId, points, comment) => {
            await onSaveGrade?.(studentId, activity.id, points, comment)
          }}
        />
      )}
    </div>
  )
}
