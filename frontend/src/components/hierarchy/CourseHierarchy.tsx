import { useEffect, useRef, useState } from 'react'
import { ActivityCard } from '../activity/ActivityCard'
import type { Course, GradebookEntry } from '../../types/models'

interface CourseHierarchyProps {
  course: Course
  isTeacher: boolean
  currentUserId: string
  gradebookEntries?: GradebookEntry[]
  onActivitySelect: (activityId: string) => void
  onCreateUnit: (title: string, description: string) => Promise<string>
  onCreateLesson: (unitId: string, title: string, description: string) => Promise<string>
  onCreateActivity: (lessonId: string) => void
  onToggleActivityVisibility: (activityId: string, visible: boolean) => Promise<void>
}

interface ActionMenuProps {
  onAdd?: () => void
}

const ActionMenu = ({ onAdd }: ActionMenuProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        aria-label="Actions"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[120px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {onAdd && (
            <button
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false)
                onAdd()
              }}
            >
              + Add
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface NameDescModalProps {
  open: boolean
  title: string
  onClose: () => void
  onConfirm: (name: string, description: string) => Promise<void>
}

const NameDescModal = ({ open, title, onClose, onConfirm }: NameDescModalProps) => {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setName('')
      setDesc('')
      setError(null)
      setSaving(false)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-500">
            ✕
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Enter name…"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              className="h-24 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Enter description…"
              value={desc}
              onChange={(event) => setDesc(event.target.value)}
            />
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={!name.trim() || saving}
            onClick={async () => {
              try {
                setSaving(true)
                setError(null)
                await onConfirm(name.trim(), desc.trim())
                onClose()
              } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : 'Failed to save')
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Saving…' : 'Create'}
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
  onCreateUnit,
  onCreateLesson,
  onCreateActivity,
  onToggleActivityVisibility,
}: CourseHierarchyProps) => {
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({})
  const [openLessons, setOpenLessons] = useState<Record<string, boolean>>({})
  const [lessonModalUnit, setLessonModalUnit] = useState<string | null>(null)
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [savingActivityId, setSavingActivityId] = useState<string | null>(null)

  useEffect(() => {
    if (!isTeacher) {
      return
    }

    setOpenUnits((previous) => {
      let changed = false
      const next = { ...previous }

      for (const unit of course.units) {
        if (!(unit.id in next) && unit.lessons.length === 0) {
          next[unit.id] = true
          changed = true
        }
      }

      return changed ? next : previous
    })

    setOpenLessons((previous) => {
      let changed = false
      const next = { ...previous }

      for (const unit of course.units) {
        for (const lesson of unit.lessons) {
          if (!(lesson.id in next) && lesson.activities.length === 0) {
            next[lesson.id] = true
            changed = true
          }
        }
      }

      return changed ? next : previous
    })
  }, [course.units, isTeacher])

  const getEntry = (activityId: string) =>
    gradebookEntries.find((entry) => entry.activityId === activityId && entry.studentId === currentUserId)

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{course.title} • Units & Lessons</h3>
        <div className="space-y-3">
          {course.units.map((unit) => {
            const unitActivities = unit.lessons.flatMap((lesson) => lesson.activities)
            const completedCount = unitActivities.filter((activity) => {
              const entry = getEntry(activity.id)
              return Boolean(
                entry?.submitted || (entry?.pointsEarned !== null && entry?.pointsEarned !== undefined),
              )
            }).length

            return (
              <div key={unit.id} className="rounded-xl border border-slate-200">
                <div className="flex items-center justify-between p-3">
                  <button
                    className="flex items-center gap-2 text-left font-medium text-slate-800"
                    onClick={() =>
                      setOpenUnits((previous) => ({ ...previous, [unit.id]: !previous[unit.id] }))
                    }
                  >
                    {openUnits[unit.id] ? '▾' : '▸'} {unit.title}
                    {!isTeacher && unitActivities.length > 0 && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {completedCount}/{unitActivities.length}
                      </span>
                    )}
                  </button>
                  {isTeacher && <ActionMenu onAdd={() => setLessonModalUnit(unit.id)} />}
                </div>
                {openUnits[unit.id] && (
                  <div className="space-y-2 border-t border-slate-100 p-3">
                    {unit.lessons.map((lesson) => (
                      <div key={lesson.id} className="rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between p-2.5">
                          <button
                            className="text-left text-sm font-medium text-slate-700"
                            onClick={() =>
                              setOpenLessons((previous) => ({
                                ...previous,
                                [lesson.id]: !previous[lesson.id],
                              }))
                            }
                          >
                            {openLessons[lesson.id] ? '▾' : '▸'} {lesson.title}
                          </button>
                          {isTeacher && <ActionMenu onAdd={() => onCreateActivity(lesson.id)} />}
                        </div>
                        {openLessons[lesson.id] && (
                          <div className="space-y-2 border-t border-slate-100 p-3">
                            {lesson.activities
                              .filter((activity) => isTeacher || activity.visible)
                              .map((activity) => (
                                <div
                                  key={activity.id}
                                  className={`flex items-center justify-between rounded-lg p-2.5 ${
                                    activity.visible === false ? 'bg-slate-100 opacity-60' : 'bg-slate-50'
                                  }`}
                                >
                                  <div className="flex flex-1 items-center gap-2">
                                    {isTeacher && activity.visible === false && (
                                      <span title="Hidden from students" className="text-slate-400">
                                        🚫
                                      </span>
                                    )}
                                    <ActivityCard
                                      activity={activity}
                                      currentUserId={currentUserId}
                                      isTeacher={isTeacher}
                                      gradebookEntries={gradebookEntries}
                                      onSelect={onActivitySelect}
                                    />
                                  </div>
                                  {isTeacher && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        title={activity.visible === false ? 'Show to students' : 'Hide from students'}
                                        onClick={async () => {
                                          try {
                                            setSavingActivityId(activity.id)
                                            await onToggleActivityVisibility(
                                              activity.id,
                                              activity.visible === false,
                                            )
                                          } finally {
                                            setSavingActivityId(null)
                                          }
                                        }}
                                        disabled={savingActivityId === activity.id}
                                        className="rounded p-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
                                      >
                                        {activity.visible === false ? '👁' : '🚫'}
                                      </button>
                                      <ActionMenu onAdd={() => onCreateActivity(lesson.id)} />
                                    </div>
                                  )}
                                </div>
                              ))}
                            {lesson.activities.length === 0 && (
                              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                                No activities yet.
                              </p>
                            )}
                            {isTeacher && (
                              <button
                                className="w-full rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-700"
                                onClick={() => onCreateActivity(lesson.id)}
                              >
                                + Add new activity
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {unit.lessons.length === 0 && (
                      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                        No lessons yet.
                      </p>
                    )}
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
            )
          })}
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

      <NameDescModal
        open={lessonModalUnit !== null}
        title="Add New Lesson"
        onClose={() => setLessonModalUnit(null)}
        onConfirm={async (name, description) => {
          if (!lessonModalUnit) return
          const lessonId = await onCreateLesson(lessonModalUnit, name, description)
          setOpenUnits((previous) => ({ ...previous, [lessonModalUnit]: true }))
          setOpenLessons((previous) => ({ ...previous, [lessonId]: true }))
        }}
      />

      <NameDescModal
        open={unitModalOpen}
        title="Add New Unit"
        onClose={() => setUnitModalOpen(false)}
        onConfirm={async (name, description) => {
          const unitId = await onCreateUnit(name, description)
          setOpenUnits((previous) => ({ ...previous, [unitId]: true }))
        }}
      />
    </>
  )
}
