import { useState } from 'react'
import type { ActivityType } from '../../types/models'

interface ActivityCreationModalProps {
  open: boolean
  onClose: () => void
}

export const ActivityCreationModal = ({ open, onClose }: ActivityCreationModalProps) => {
  const [step, setStep] = useState(1)
  const [type, setType] = useState<ActivityType>('video')

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Create Activity • Step {step} of 3</h3>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Choose an activity type.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['video', 'coding', 'quiz', 'project', 'godot'] as ActivityType[]).map((choice) => (
                <button
                  key={choice}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    type === choice ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'
                  }`}
                  onClick={() => setType(choice)}
                >
                  <p className="font-medium uppercase">{choice}</p>
                  <p className="text-xs text-slate-500">Template for {choice} activity</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">Enter title, due date, points, and links for this {type} activity.</p>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Activity title" />
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Due date" />
              <input className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Points" />
            </div>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Resource URL" />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">Create directions, prompts, and quiz questions if needed.</p>
            <textarea
              className="h-32 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Teacher instructions (WYSIWYG/HTML toggle placeholder)"
            />
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
          >
            Back
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              if (step < 3) {
                setStep(step + 1)
              } else {
                onClose()
                setStep(1)
              }
            }}
          >
            {step < 3 ? 'Next' : 'Save activity'}
          </button>
        </div>
      </div>
    </div>
  )
}
