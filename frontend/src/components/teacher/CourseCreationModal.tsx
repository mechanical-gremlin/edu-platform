import { useState } from 'react'

interface CourseCreationModalProps {
  onClose: () => void
  onCreate: (title: string, code: string, description: string) => Promise<void>
}

export const CourseCreationModal = ({ onClose, onCreate }: CourseCreationModalProps) => {
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!title.trim() || !code.trim()) return
    try {
      setSaving(true)
      setError(null)
      await onCreate(title.trim(), code.trim(), description.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Create New Course</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Course Title</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g. Introduction to Computer Science"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Course Code</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g. CSP-101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
            <textarea
              className="mt-1 h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Brief description of the course..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={saving || !title.trim() || !code.trim()}
            onClick={handleSubmit}
          >
            {saving ? 'Creating…' : 'Create Course'}
          </button>
        </div>
      </div>
    </div>
  )
}
