import { useEffect, useState } from 'react'
import type { ActivityType, CreateActivityInput, StarterFile } from '../../types/models'
import { DirectionsEditor } from './DirectionsEditor'
import { MonacoEditor, CODING_LANGUAGES } from '../coding/MonacoEditor'
import { WebProjectEditor } from '../coding/WebProjectEditor'

interface ActivityCreationModalProps {
  open: boolean
  onClose: () => void
  onSave: (input: CreateActivityInput) => Promise<void>
  executeUrl?: string
  runUserId?: string
}

const suggestedResourceUrls: Record<ActivityType, string> = {
  video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  coding: '',
  quiz: '',
  project: '',
  godot: 'https://editor.godotengine.org/releases/latest/',
}

export const ActivityCreationModal = ({
  open,
  onClose,
  onSave,
  executeUrl,
  runUserId,
}: ActivityCreationModalProps) => {
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
  const [languageLocked, setLanguageLocked] = useState(false)
  const [starterCode, setStarterCode] = useState('')
  const [starterFiles, setStarterFiles] = useState<StarterFile[] | null>(null)
  const [expectedOutput, setExpectedOutput] = useState('')
  const [autograderEnabled, setAutograderEnabled] = useState(false)
  const [autograderReferenceSolution, setAutograderReferenceSolution] = useState('')
  const [autograderReferenceOutput, setAutograderReferenceOutput] = useState('')
  const [autograderCodeMatch, setAutograderCodeMatch] = useState(false)
  const [autograderOutputMatch, setAutograderOutputMatch] = useState(true)
  const [autograderRunInput, setAutograderRunInput] = useState('')
  const [autograderTestCases, setAutograderTestCases] = useState([{ input: '', expectedOutput: '' }])

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
      setLanguageLocked(false)
      setStarterCode('')
      setStarterFiles(null)
      setExpectedOutput('')
      setAutograderEnabled(false)
      setAutograderReferenceSolution('')
      setAutograderReferenceOutput('')
      setAutograderCodeMatch(false)
      setAutograderOutputMatch(true)
      setAutograderRunInput('')
      setAutograderTestCases([{ input: '', expectedOutput: '' }])
    }
  }, [open])

  if (!open) {
    return null
  }

  const points = Number(pointsPossible)
  const detailsValid = title.trim() && description.trim() && Number.isInteger(points) && points >= 0
  const modalWidthClass = step === 4 && type === 'coding' ? 'max-w-6xl' : 'max-w-3xl'
  const autograderSupported = type === 'coding' && starterLanguage !== 'web' && starterLanguage !== 'html'
  const activeAutograderCases = autograderTestCases.filter(
    (testCase) => testCase.input.trim() || testCase.expectedOutput.trim(),
  )
  const autograderCasesValid = activeAutograderCases.every(
    (testCase) => testCase.expectedOutput.trim(),
  )
  const autograderValid = !autograderEnabled || (
    autograderSupported
    && autograderReferenceSolution.trim()
    && (
      autograderCodeMatch
      || autograderOutputMatch
      || activeAutograderCases.length > 0
    )
    && (!autograderOutputMatch || autograderReferenceOutput.trim())
    && autograderCasesValid
  )

  const computedResourceUrl = (): string | null => {
    if (resourceUrl.trim()) return resourceUrl.trim()
    return suggestedResourceUrls[type] || null
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${modalWidthClass}`}>
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
              Choose a language and write starter code students will see pre-loaded in their editor.
              {starterLanguage !== 'web' && ' Optionally set expected output for automatic pass/fail feedback.'}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Language</label>
              <select
                className="rounded border border-slate-200 px-2 py-1 text-sm"
                value={starterLanguage}
                onChange={(e) => {
                  const nextLanguage = e.target.value
                  setStarterLanguage(nextLanguage)
                  setStarterCode('')
                  setStarterFiles(null)
                  if (nextLanguage === 'web' || nextLanguage === 'html') {
                    setAutograderEnabled(false)
                  }
                }}
              >
                {CODING_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={languageLocked}
                onChange={(event) => setLanguageLocked(event.target.checked)}
              />
              Lock language for students (sandbox activities can leave this unlocked)
            </label>

            {starterLanguage === 'web' ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  The file explorer starts collapsed so the editor and preview stay inside this window.
                </p>
                <WebProjectEditor
                  defaultFiles={starterFiles}
                  onChange={setStarterFiles}
                  height="350px"
                />
              </div>
            ) : (
              <>
                <MonacoEditor
                  defaultValue={starterCode}
                  language={starterLanguage}
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={autograderEnabled}
                          onChange={(event) => setAutograderEnabled(event.target.checked)}
                          disabled={!autograderSupported}
                        />
                        Enable autograder
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        Save time with automatic 100 / 50 / 0 grading, then override manually if needed.
                      </p>
                    </div>
                    {!autograderSupported && (
                      <p className="max-w-sm text-xs text-amber-700">
                        Autograder currently supports executable Judge0 languages only. HTML and Web Development Kit activities still require manual grading.
                      </p>
                    )}
                  </div>
                  {autograderEnabled && autograderSupported && (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="font-medium text-slate-700">Suggested solution</label>
                            <span className="text-xs text-slate-500">
                              Teachers can run this code below and use the result as the reference output.
                            </span>
                          </div>
                          <MonacoEditor
                            defaultValue={autograderReferenceSolution}
                            language={starterLanguage}
                            onChange={setAutograderReferenceSolution}
                            executeUrl={executeUrl}
                            userId={runUserId}
                            stdin={autograderRunInput}
                            showStdinField
                            onStdinChange={setAutograderRunInput}
                            onExecutionComplete={(result) => {
                              const nextOutput = result.stdout?.trim() ?? ''
                              if (nextOutput) {
                                setAutograderReferenceOutput(nextOutput)
                              }
                            }}
                            minHeight="320px"
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checks</p>
                            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={autograderCodeMatch}
                                onChange={(event) => setAutograderCodeMatch(event.target.checked)}
                              />
                              Match the code structure (normalized exact match)
                            </label>
                            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={autograderOutputMatch}
                                onChange={(event) => setAutograderOutputMatch(event.target.checked)}
                              />
                              Match the no-input program output
                            </label>
                            <div className="mt-3">
                              <label className="mb-1 block text-xs font-medium text-slate-600">
                                Reference output for no-input runs
                              </label>
                              <textarea
                                className="h-24 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                                placeholder="Run the suggested solution to populate this, or type the expected stdout."
                                value={autograderReferenceOutput}
                                onChange={(event) => setAutograderReferenceOutput(event.target.value)}
                              />
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Input/output checks</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Each case needs an expected output. Leave input blank if the program should run with empty stdin.
                                </p>
                              </div>
                              <button
                                type="button"
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() =>
                                  setAutograderTestCases((current) => [...current, { input: '', expectedOutput: '' }])
                                }
                              >
                                + Add case
                              </button>
                            </div>
                            <div className="mt-3 space-y-3">
                              {autograderTestCases.map((testCase, index) => (
                                <div key={`autograder-case-${index}`} className="rounded-lg border border-slate-200 p-3">
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-slate-700">Case {index + 1}</p>
                                    {autograderTestCases.length > 1 && (
                                      <button
                                        type="button"
                                        className="text-xs font-medium text-rose-600 hover:underline"
                                        onClick={() =>
                                          setAutograderTestCases((current) => current.filter((_, currentIndex) => currentIndex !== index))
                                        }
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">Input</label>
                                  <textarea
                                    className="h-16 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                                    placeholder="stdin for this test case"
                                    value={testCase.input}
                                    onChange={(event) =>
                                      setAutograderTestCases((current) =>
                                        current.map((item, currentIndex) =>
                                          currentIndex === index ? { ...item, input: event.target.value } : item,
                                        ),
                                      )
                                    }
                                  />
                                  <label className="mb-1 mt-3 block text-xs font-medium text-slate-600">Expected output</label>
                                  <textarea
                                    className="h-16 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                                    placeholder="stdout expected for this input"
                                    value={testCase.expectedOutput}
                                    onChange={(event) =>
                                      setAutograderTestCases((current) =>
                                        current.map((item, currentIndex) =>
                                          currentIndex === index ? { ...item, expectedOutput: event.target.value } : item,
                                        ),
                                      )
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      {!autograderValid && (
                        <p className="text-xs text-rose-600">
                          Add a suggested solution, choose at least one check, and fill every expected-output field before saving.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
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
            disabled={(step === 2 && !detailsValid) || (step === 4 && type === 'coding' && !autograderValid) || saving}
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
                  language: type === 'coding' ? starterLanguage : null,
                  languageLocked: type === 'coding' ? languageLocked : false,
                  starterCode: type === 'coding' && starterLanguage !== 'web' ? (starterCode.trim() || null) : null,
                  starterFiles: type === 'coding' && starterLanguage === 'web' ? (starterFiles ?? null) : null,
                  expectedOutput: type === 'coding' && starterLanguage !== 'web' ? (expectedOutput.trim() || null) : null,
                  autograderEnabled: type === 'coding' && autograderEnabled && autograderSupported,
                  autograderReferenceSolution:
                    type === 'coding' && autograderEnabled && autograderSupported
                      ? (autograderReferenceSolution.trim() || null)
                      : null,
                  autograderReferenceOutput:
                    type === 'coding' && autograderEnabled && autograderSupported && autograderOutputMatch
                      ? (autograderReferenceOutput.trim() || null)
                      : null,
                  autograderCodeMatch:
                    type === 'coding' && autograderEnabled && autograderSupported ? autograderCodeMatch : false,
                  autograderOutputMatch:
                    type === 'coding' && autograderEnabled && autograderSupported ? autograderOutputMatch : false,
                  autograderTestCases:
                    type === 'coding' && autograderEnabled && autograderSupported
                      ? activeAutograderCases
                          .filter((testCase) => testCase.expectedOutput.trim())
                          .map((testCase) => ({
                            input: testCase.input,
                            expectedOutput: testCase.expectedOutput.trim(),
                          }))
                      : null,
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
