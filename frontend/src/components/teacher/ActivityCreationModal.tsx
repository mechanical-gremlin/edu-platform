import { useEffect, useState } from 'react'
import type { ActivityType, CreateActivityInput } from '../../types/models'
import { DirectionsEditor } from './DirectionsEditor'
import { MonacoEditor } from '../coding/MonacoEditor'

interface ActivityCreationModalProps {
  open: boolean
  onClose: () => void
  onSave: (input: CreateActivityInput) => Promise<void>
}

const suggestedResourceUrls: Record<ActivityType, string> = {
  video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  coding: '',
  quiz: '',
  project: '',
  godot: 'https://editor.godotengine.org/releases/latest/',
}

export const ActivityCreationModal = ({ open, onClose, onSave }: ActivityCreationModalProps) => {
  const [step, setStep] = useState(1)
  const [type, setType] = useState<ActivityType>('video')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [pointsPossible, setPointsPossible] = useState('10')
  const [resourceUrl, setResourceUrl] = useState('')
  const [directions, setDirections] = useState('')
  const [visible, setVisible] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [starterLanguage, setStarterLanguage] = useState('javascript')
  const [starterCode, setStarterCode] = useState('')
  const [expectedOutput, setExpectedOutput] = useState('')

  const totalSteps = type === 'coding' ? 4 : 3

  useEffect(() => {
    if (!open) {
      setStep(1)
      setType('video')
      setTitle('')
      setDescription('')
      setDueDate('')
      setPointsPossible('10')
      setResourceUrl('')
      setDirections('')
      setVisible(true)
      setError(null)
      setSaving(false)
      setStarterLanguage('javascript')
      setStarterCode('')
      setExpectedOutput('')
    }
  }, [open])

  if (!open) {
    return null
  }

  const points = Number(pointsPossible)
  const detailsValid = title.trim() && description.trim() && Number.isInteger(points) && points >= 0

  const computedResourceUrl = (): string | null => {
    if (resourceUrl.trim()) return resourceUrl.trim()
    return suggestedResourceUrls[type] || null
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Create Activity • Step {step} of {totalSteps}
          </h3>
          <button onClick={onClose} className="text-slate-500">
            ✕
          </button>
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
                  <p className="text-xs text-slate-500">Demo-ready template for {choice} activities</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">Set the assignment details for this {type} activity.</p>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Activity title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <textarea
              className="h-24 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Short activity summary"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="date"
                className="rounded-lg border border-slate-200 px-3 py-2"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
              <input
                type="number"
                min={0}
                step={1}
                className="rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Points"
                value={pointsPossible}
                onChange={(event) => setPointsPossible(event.target.value)}
              />
            </div>
            {type !== 'coding' && (
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder={`Resource URL (leave blank to use suggested ${type} demo resource)`}
                value={resourceUrl}
                onChange={(event) => setResourceUrl(event.target.value)}
              />
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={visible}
                onChange={(event) => setVisible(event.target.checked)}
              />
              Visible to students immediately
            </label>
          </div>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-slate-600">Add student directions in the basic online editor.</p>
            <DirectionsEditor value={directions} onChange={setDirections} />
          </>
        )}

        {step === 4 && type === 'coding' && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">
              Write the starter code students will see pre-loaded in their Monaco editor. Optionally
              set expected output to give students automatic pass/fail feedback when they run their code.
            </p>
            <MonacoEditor
              defaultValue={starterCode}
              language={starterLanguage}
              showLanguageSelector
              onLanguageChange={setStarterLanguage}
              onChange={setStarterCode}
              minHeight="300px"
            />
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                Expected Output{' '}
                <span className="text-xs font-normal text-slate-400">
                  (optional — exact stdout the student's program should produce)
                </span>
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs"
                placeholder="e.g. Hello, World!"
                value={expectedOutput}
                onChange={(event) => setExpectedOutput(event.target.value)}
              />
              {expectedOutput.trim() && (
                <p className="mt-1 text-xs text-indigo-600">
                  ✓ Students will see pass/fail feedback when their output matches this.
                </p>
              )}
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <div className="mt-6 flex justify-between">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={saving}
          >
            Back
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={(step === 2 && !detailsValid) || saving}
            onClick={async () => {
              if (step < totalSteps) {
                setStep(step + 1)
                return
              }

              try {
                setSaving(true)
                setError(null)
                await onSave({
                  title: title.trim(),
                  type,
                  description: description.trim(),
                  directions: directions.trim() || null,
                  starterCode: type === 'coding' ? (starterCode.trim() || null) : null,
                  expectedOutput: type === 'coding' ? (expectedOutput.trim() || null) : null,
                  dueAt: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null,
                  pointsPossible: points,
                  resourceUrl: computedResourceUrl(),
                  visible,
                })
              } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : 'Failed to save activity')
              } finally {
                setSaving(false)
              }
            }}
          >
            {step < totalSteps ? 'Next' : saving ? 'Saving…' : 'Save activity'}
          </button>
        </div>
      </div>
    </div>
  )
}
