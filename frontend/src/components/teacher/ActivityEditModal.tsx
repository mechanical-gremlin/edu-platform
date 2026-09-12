import { useEffect, useState } from 'react'
import type { Activity, UpdateActivityInput } from '../../types/models'
import { DirectionsEditor } from './DirectionsEditor'

interface ActivityEditModalProps {
  open: boolean
  activity: Activity | null
  onClose: () => void
  onSave: (input: UpdateActivityInput) => Promise<void>
}

export const ActivityEditModal = ({ open, activity, onClose, onSave }: ActivityEditModalProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [directions, setDirections] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [pointsPossible, setPointsPossible] = useState('0')
  const [resourceUrl, setResourceUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !activity) {
      setTitle('')
      setDescription('')
      setDirections('')
      setDueDate('')
      setPointsPossible('0')
      setResourceUrl('')
      setError(null)
      setSaving(false)
      return
    }

    setTitle(activity.title)
    setDescription(activity.description)
    setDirections(activity.directions ?? '')
    setDueDate(activity.dueDate ?? '')
    setPointsPossible(String(activity.points))
    setResourceUrl(activity.resourceUrl ?? '')
    setError(null)
    setSaving(false)
  }, [activity, open])

  if (!open || !activity) {
    return null
  }

  const points = Number(pointsPossible)
  const isValid = title.trim() && description.trim() && Number.isInteger(points) && points >= 0

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Edit Assignment</h3>
          <button onClick={onClose} className="text-slate-500">
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block font-medium text-slate-700">Title</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block font-medium text-slate-700">Summary</label>
              <textarea
                className="h-24 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Due date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Points</label>
              <input
                type="number"
                min={0}
                step={1}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={pointsPossible}
                onChange={(event) => setPointsPossible(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block font-medium text-slate-700">Resource URL</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={resourceUrl}
                onChange={(event) => setResourceUrl(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block font-medium text-slate-700">Directions</label>
              <DirectionsEditor value={directions} onChange={setDirections} />
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={!isValid || saving}
            onClick={async () => {
              try {
                setSaving(true)
                setError(null)
                await onSave({
                  title: title.trim(),
                  description: description.trim(),
                  directions: directions.trim() || null,
                  dueAt: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null,
                  pointsPossible: points,
                  resourceUrl: resourceUrl.trim() || null,
                })
              } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : 'Failed to save activity')
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
