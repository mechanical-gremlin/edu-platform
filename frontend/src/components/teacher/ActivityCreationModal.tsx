import { useEffect, useState } from 'react'
import type { ActivityType, CreateActivityInput } from '../../types/models'
import { DirectionsEditor } from './DirectionsEditor'

interface ActivityCreationModalProps {
  open: boolean
  onClose: () => void
  onSave: (input: CreateActivityInput) => Promise<void>
}

const CODING_LANGUAGES: { value: string; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'html', label: 'HTML' },
  { value: 'php', label: 'PHP' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
]

const buildCodingUrl = (language: string, code: string): string => {
  const base = `https://onecompiler.com/embed/${language}`
  if (!code.trim()) return `${base}?theme=dark&hideLanguageSelection=false`
  return `${base}?theme=dark&hideLanguageSelection=false&code=${encodeURIComponent(code)}`
}

const suggestedResourceUrls: Record<ActivityType, string> = {
  video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  coding: 'https://onecompiler.com/embed/javascript?theme=dark&hideLanguageSelection=false',
  quiz: '',
  project: 'https://onecompiler.com/embed/javascript?theme=dark',
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
    }
  }, [open])

  if (!open) {
    return null
  }

  const points = Number(pointsPossible)
  const detailsValid = title.trim() && description.trim() && Number.isInteger(points) && points >= 0

  const computedResourceUrl = (): string | null => {
    if (resourceUrl.trim()) return resourceUrl.trim()
    if (type === 'coding') return buildCodingUrl(starterLanguage, starterCode)
    return suggestedResourceUrls[type] || null
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
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
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">
              Optionally provide a programming language and starter code. Students will see this code
              pre-loaded in their editor when they open the activity.
            </p>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Programming Language</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={starterLanguage}
                onChange={(event) => setStarterLanguage(event.target.value)}
              >
                {CODING_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                Starter Code{' '}
                <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                className="h-48 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder={`// Write the starter code students will see\nconsole.log("Hello, World!");`}
                value={starterCode}
                onChange={(event) => setStarterCode(event.target.value)}
                spellCheck={false}
              />
            </div>
            {starterCode.trim() && (
              <p className="text-xs text-indigo-600">
                ✓ Starter code will be pre-loaded into the OneCompiler editor for all students.
              </p>
            )}
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
