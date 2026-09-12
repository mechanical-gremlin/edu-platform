import { useEffect, useState } from 'react'
import { MonacoEditor } from '../coding/MonacoEditor'
import { WebProjectEditor } from '../coding/WebProjectEditor'
import type { ActivityType, GradebookEntry, StarterFile } from '../../types/models'

interface GradingPanelProps {
  activityId: string
  activityTitle: string
  activityType: ActivityType
  activityLanguage: string | null | undefined
  entries: GradebookEntry[]
  executeUrl?: string
  runUserId?: string
  onClose: () => void
  onSave: (studentId: string, points: number, comment: string) => Promise<void>
}

const parseSubmissionFiles = (submissionText: string | null | undefined): StarterFile[] => {
  if (!submissionText?.trim()) {
    return [{ name: 'index.html', language: 'html', content: '' }]
  }

  try {
    const parsed = JSON.parse(submissionText) as unknown
    if (!Array.isArray(parsed)) {
      return [{ name: 'index.html', language: 'html', content: submissionText }]
    }
    const files = parsed.filter(
      (file): file is StarterFile =>
        typeof file === 'object'
        && file !== null
        && typeof Reflect.get(file, 'name') === 'string'
        && typeof Reflect.get(file, 'language') === 'string'
        && typeof Reflect.get(file, 'content') === 'string',
    )
    if (files.length > 0) return files
    return [{ name: 'index.html', language: 'html', content: submissionText }]
  } catch {
    return [{ name: 'index.html', language: 'html', content: submissionText }]
  }
}

export const GradingPanel = ({
  activityId,
  activityTitle,
  activityType,
  activityLanguage,
  entries,
  executeUrl,
  runUserId,
  onClose,
  onSave,
}: GradingPanelProps) => {
  const students = entries.filter((entry) => entry.activityId === activityId)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewCode, setReviewCode] = useState('')
  const [reviewFiles, setReviewFiles] = useState<StarterFile[]>([{ name: 'index.html', language: 'html', content: '' }])
  const [grades, setGrades] = useState<Record<string, { points: string; comment: string }>>(() => {
    const initial: Record<string, { points: string; comment: string }> = {}
    for (const entry of students) {
      initial[entry.studentId] = {
        points: entry.pointsEarned !== null ? String(entry.pointsEarned) : '',
        comment: entry.comment ?? '',
      }
    }
    return initial
  })
  const panelWidthClass = activityType === 'coding' ? 'max-w-6xl' : 'max-w-md'
  const current = students[currentIndex] ?? null
  const currentSubmissionText = current?.submissionText ?? null

  useEffect(() => {
    if (activityType === 'coding' && activityLanguage === 'web') {
      setReviewFiles(parseSubmissionFiles(currentSubmissionText))
      setReviewCode('')
      return
    }

    setReviewFiles([{ name: 'index.html', language: 'html', content: '' }])
    setReviewCode(currentSubmissionText ?? '')
  }, [activityLanguage, activityType, current?.studentId, currentSubmissionText])

  if (students.length === 0) {
    return (
      <div className={`fixed inset-y-0 right-0 z-40 flex w-full ${panelWidthClass} flex-col border-l border-slate-200 bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Grade: {activityTitle}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
          No enrolled students for this activity yet.
        </div>
      </div>
    )
  }

  const activeStudent = current ?? students[0]
  const currentGrade = grades[activeStudent.studentId] ?? { points: '', comment: '' }

  const setPoints = (value: string) =>
    setGrades((previous) => ({
      ...previous,
      [activeStudent.studentId]: { ...previous[activeStudent.studentId], points: value },
    }))
  const setComment = (value: string) =>
    setGrades((previous) => ({
      ...previous,
      [activeStudent.studentId]: { ...previous[activeStudent.studentId], comment: value },
    }))

  const pointsNum = Number(currentGrade.points)
  const valid =
    currentGrade.points === '' ||
    (Number.isInteger(pointsNum) && pointsNum >= 0 && pointsNum <= activeStudent.pointsPossible)
  const canSave = valid && currentGrade.points !== ''

  const persistCurrent = async () => {
    if (!canSave) return false

    try {
      setSaving(true)
      setError(null)
      await onSave(activeStudent.studentId, pointsNum, currentGrade.comment)
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save grade')
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`fixed inset-y-0 right-0 z-40 flex w-full ${panelWidthClass} flex-col border-l border-slate-200 bg-white shadow-xl`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Grading: {activityTitle}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Student {currentIndex + 1} of {students.length}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Close grading panel"
        >
          ✕
        </button>
      </div>

      <div className="border-b border-slate-100 px-5 py-3">
        <p className="text-sm font-semibold text-slate-800">{activeStudent.studentName}</p>
        <p className="text-xs text-slate-500">
          {activeStudent.submitted ? (
            <span className="text-emerald-600">✓ Submitted {activeStudent.submittedAt?.slice(0, 10) ?? ''}</span>
          ) : (
            <span className="text-slate-400">Not submitted</span>
          )}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Submission</p>
          {activityType === 'coding' ? (
            activityLanguage === 'web' ? (
              <WebProjectEditor
                key={`${activityId}-${activeStudent.studentId}`}
                defaultFiles={reviewFiles}
                readOnly
                height="360px"
              />
            ) : (
              <MonacoEditor
                key={`${activityId}-${activeStudent.studentId}`}
                defaultValue={reviewCode}
                language={activityLanguage ?? 'javascript'}
                onChange={setReviewCode}
                readOnly
                executeUrl={executeUrl}
                userId={runUserId}
                minHeight="360px"
              />
            )
          ) : (
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {activeStudent.submissionText?.trim() || 'No submission text provided.'}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Points <span className="font-normal text-slate-400">/ {activeStudent.pointsPossible}</span>
          </label>
          <input
            type="number"
            min={0}
            max={activeStudent.pointsPossible}
            step={1}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              !valid ? 'border-red-400' : 'border-slate-200'
            }`}
            placeholder={`0 – ${activeStudent.pointsPossible}`}
            value={currentGrade.points}
            onChange={(event) => setPoints(event.target.value)}
          />
          {!valid && (
            <p className="mt-1 text-xs text-red-500">Must be a whole number between 0 and {activeStudent.pointsPossible}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Comment to student</label>
          <textarea
            className="h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Optional feedback…"
            value={currentGrade.comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      <div className="border-t border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <button
            disabled={currentIndex === 0 || saving}
            onClick={async () => {
              if (canSave) {
                await persistCurrent()
              }
              setCurrentIndex((index) => index - 1)
            }}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹ Prev Student
          </button>
          {currentIndex < students.length - 1 ? (
            <button
              disabled={!canSave || saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              onClick={async () => {
                if (await persistCurrent()) {
                  setCurrentIndex((index) => index + 1)
                }
              }}
            >
              {saving ? 'Saving…' : 'Save & Next ›'}
            </button>
          ) : (
            <button
              disabled={!canSave || saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              onClick={async () => {
                if (await persistCurrent()) {
                  onClose()
                }
              }}
            >
              {saving ? 'Saving…' : '✓ Done Grading'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
