import { useCallback, useEffect, useState } from 'react'
import type { User } from '../../types/models'

interface RosterModalProps {
  courseId: string
  courseTitle: string
  currentUserId: string
  onClose: () => void
  onAddEnrollment: (courseId: string, userId: string, role: 'teacher' | 'student') => Promise<void>
  fetchUsers: () => Promise<User[]>
}

export const RosterModal = ({
  courseId,
  courseTitle,
  currentUserId,
  onClose,
  onAddEnrollment,
  fetchUsers,
}: RosterModalProps) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const list = await fetchUsers()
      setUsers(list.filter((u) => u.id !== currentUserId))
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [currentUserId, fetchUsers])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const handleAdd = async (userId: string, role: 'teacher' | 'student') => {
    try {
      setAdding(userId)
      setError(null)
      await onAddEnrollment(courseId, userId, role)
      setAddedIds((prev) => new Set([...prev, userId]))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add enrollment')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Manage Roster – {courseTitle}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">Add users to this course as students or co-teachers.</p>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="mt-4 max-h-80 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No other users found.</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">
                    {user.email} · {user.role}
                  </p>
                </div>
                {addedIds.has(user.id) ? (
                  <span className="text-sm text-emerald-600">✓ Added</span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      disabled={adding === user.id}
                      onClick={() => handleAdd(user.id, 'student')}
                    >
                      + Student
                    </button>
                    <button
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                      disabled={adding === user.id}
                      onClick={() => handleAdd(user.id, 'teacher')}
                    >
                      + Teacher
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
