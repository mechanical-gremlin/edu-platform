import { useState } from 'react'
import type { GradebookEntry } from '../../types/models'

interface GradingPanelProps {
  activityId: string
  activityTitle: string
  entries: GradebookEntry[]
  onClose: () => void
  onSave: (studentId: string, points: number, comment: string) => void
}

export const GradingPanel = ({ activityId, activityTitle, entries, onClose, onSave }: GradingPanelProps) => {
  const students = entries.filter((e) => e.activityId === activityId)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [grades, setGrades] = useState<Record<string, { points: string; comment: string }>>(() => {
    const initial: Record<string, { points: string; comment: string }> = {}
    for (const e of students) {
      initial[e.studentId] = {
        points: e.pointsEarned !== null ? String(e.pointsEarned) : '',
        comment: e.comment ?? '',
      }
    }
    return initial
  })

  if (students.length === 0) {
    return (
      <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Grade: {activityTitle}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
          No submissions for this activity yet.
        </div>
      </div>
    )
  }

  const current = students[currentIndex]
  const currentGrade = grades[current.studentId] ?? { points: '', comment: '' }

  const setPoints = (v: string) =>
    setGrades((prev) => ({ ...prev, [current.studentId]: { ...prev[current.studentId], points: v } }))
  const setComment = (v: string) =>
    setGrades((prev) => ({ ...prev, [current.studentId]: { ...prev[current.studentId], comment: v } }))

  const pointsNum = parseFloat(currentGrade.points)
  const valid = currentGrade.points === '' || (!isNaN(pointsNum) && pointsNum >= 0 && pointsNum <= current.pointsPossible)
  const canSave = valid && currentGrade.points !== ''

  const saveCurrentAndAdvance = (isLast: boolean) => {
    if (!canSave) return
    onSave(current.studentId, parseFloat(currentGrade.points), currentGrade.comment)
    if (isLast) {
      onClose()
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Grading: {activityTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Student {currentIndex + 1} of {students.length}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close grading panel">✕</button>
      </div>

      {/* Student info */}
      <div className="border-b border-slate-100 px-5 py-3">
        <p className="text-sm font-semibold text-slate-800">{current.studentName}</p>
        <p className="text-xs text-slate-500">
          {current.submitted ? (
            <span className="text-emerald-600">✓ Submitted</span>
          ) : (
            <span className="text-slate-400">Not submitted</span>
          )}
        </p>
      </div>

      {/* Grade inputs */}
      <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Points <span className="text-slate-400 font-normal">/ {current.pointsPossible}</span>
          </label>
          <input
            type="number"
            min={0}
            max={current.pointsPossible}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              !valid ? 'border-red-400' : 'border-slate-200'
            }`}
            placeholder={`0 – ${current.pointsPossible}`}
            value={currentGrade.points}
            onChange={(e) => setPoints(e.target.value)}
          />
          {!valid && (
            <p className="mt-1 text-xs text-red-500">Must be between 0 and {current.pointsPossible}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Comment to student</label>
          <textarea
            className="h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Optional feedback…"
            value={currentGrade.comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      </div>

      {/* Navigation & save */}
      <div className="border-t border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹ Prev Student
          </button>
          {currentIndex < students.length - 1 ? (
            <button
              disabled={!canSave}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              onClick={() => saveCurrentAndAdvance(false)}
            >
              Save & Next ›
            </button>
          ) : (
            <button
              disabled={!canSave}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              onClick={() => saveCurrentAndAdvance(true)}
            >
              ✓ Done Grading
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
