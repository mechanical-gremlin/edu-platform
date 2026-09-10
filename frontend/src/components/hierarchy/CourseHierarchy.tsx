import { useState, useRef, useEffect } from 'react'
import { ActivityCard } from '../activity/ActivityCard'
import type { Course, GradebookEntry } from '../../types/models'

interface CourseHierarchyProps {
  course: Course
  isTeacher: boolean
  currentUserId: string
  gradebookEntries?: GradebookEntry[]
  onActivitySelect: (activityId: string) => void
  onCreateActivity: () => void
}

interface ActionMenuProps {
  onAdd?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

const ActionMenu = ({ onAdd, onEdit, onDelete }: ActionMenuProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        aria-label="Actions"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[120px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {onAdd && (
            <button
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => { setOpen(false); onAdd() }}
            >
              + Add
            </button>
          )}
          {onEdit && (
            <button
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => { setOpen(false); onEdit() }}
            >
              ✏ Edit
            </button>
          )}
          {onDelete && (
            <button
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => { setOpen(false); onDelete() }}
            >
              🗑 Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Simple name + description modal used for lesson / unit creation
interface NameDescModalProps {
  open: boolean
  title: string
  onClose: () => void
}

const NameDescModal = ({ open, title, onClose }: NameDescModalProps) => {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <label className="mb-1 block font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Enter name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              className="h-24 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Enter description…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={!name.trim()}
            onClick={() => { if (name.trim()) { setName(''); setDesc(''); onClose() } }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

export const CourseHierarchy = ({
  course,
  isTeacher,
  currentUserId,
  gradebookEntries = [],
  onActivitySelect,
  onCreateActivity,
}: CourseHierarchyProps) => {
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({})
  const [openLessons, setOpenLessons] = useState<Record<string, boolean>>({})
  // Visibility state per activity (teacher can toggle)
  const [hiddenActivities, setHiddenActivities] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const unit of course.units) {
      for (const lesson of unit.lessons) {
        for (const activity of lesson.activities) {
          if (activity.visible === false) initial[activity.id] = true
        }
      }
    }
    return initial
  })
  // Modal state for creating lesson / unit
  const [lessonModalUnit, setLessonModalUnit] = useState<string | null>(null)
  const [unitModalOpen, setUnitModalOpen] = useState(false)

  const toggleUnit = (unitId: string) => setOpenUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }))
  const toggleLesson = (lessonId: string) =>
    setOpenLessons((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }))
  const toggleActivityVisibility = (activityId: string) =>
    setHiddenActivities((prev) => ({ ...prev, [activityId]: !prev[activityId] }))

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{course.title} • Units & Lessons</h3>
        <div className="space-y-3">
          {course.units.map((unit) => (
            <div key={unit.id} className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between p-3">
                <button className="text-left font-medium text-slate-800" onClick={() => toggleUnit(unit.id)}>
                  {openUnits[unit.id] ? '▾' : '▸'} {unit.title}
                </button>
                {isTeacher && (
                  <ActionMenu
                    onAdd={onCreateActivity}
                  />
                )}
              </div>
              {openUnits[unit.id] && (
                <div className="space-y-2 border-t border-slate-100 p-3">
                  {unit.lessons.map((lesson) => (
                    <div key={lesson.id} className="rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between p-2.5">
                        <button className="text-left text-sm font-medium text-slate-700" onClick={() => toggleLesson(lesson.id)}>
                          {openLessons[lesson.id] ? '▾' : '▸'} {lesson.title}
                        </button>
                        {isTeacher && (
                          <ActionMenu
                            onAdd={onCreateActivity}
                          />
                        )}
                      </div>
                      {openLessons[lesson.id] && (
                        <div className="space-y-2 border-t border-slate-100 p-3">
                          {lesson.activities
                            .filter((activity) => isTeacher || !hiddenActivities[activity.id])
                            .map((activity) => {
                              const hidden = !!hiddenActivities[activity.id]
                              return (
                                <div
                                  key={activity.id}
                                  className={`flex items-center justify-between rounded-lg p-2.5 ${
                                    hidden ? 'bg-slate-100 opacity-60' : 'bg-slate-50'
                                  }`}
                                >
                                  <div className="flex flex-1 items-center gap-2">
                                    {isTeacher && hidden && (
                                      <span title="Hidden from students" className="text-slate-400">🚫</span>
                                    )}
                                    <ActivityCard
                                      activity={activity}
                                      currentUserId={currentUserId}
                                      gradebookEntries={gradebookEntries}
                                      onSelect={onActivitySelect}
                                    />
                                  </div>
                                  {isTeacher && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        title={hidden ? 'Show to students' : 'Hide from students'}
                                        onClick={() => toggleActivityVisibility(activity.id)}
                                        className="rounded p-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                      >
                                        {hidden ? '👁' : '🚫'}
                                      </button>
                                      <ActionMenu
                                        onAdd={onCreateActivity}
                                      />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          {isTeacher && (
                            <button
                              className="w-full rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-700"
                              onClick={onCreateActivity}
                            >
                              + Add new activity
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {isTeacher && (
                    <button
                      className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setLessonModalUnit(unit.id)}
                    >
                      + Add new lesson
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {isTeacher && (
          <button
            className="mt-4 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setUnitModalOpen(true)}
          >
            + Add new unit
          </button>
        )}
      </div>

      {/* Lesson creation modal */}
      <NameDescModal
        open={lessonModalUnit !== null}
        title="Add New Lesson"
        onClose={() => setLessonModalUnit(null)}
      />

      {/* Unit creation modal */}
      <NameDescModal
        open={unitModalOpen}
        title="Add New Unit"
        onClose={() => setUnitModalOpen(false)}
      />
    </>
  )
}

