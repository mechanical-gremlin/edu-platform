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
  onUpdateUnit: (unitId: string, title: string, description: string) => Promise<void>
  onUpdateLesson: (lessonId: string, title: string, description: string) => Promise<void>
  onUpdateActivity: (activityId: string) => void
  onDeleteUnit: (unitId: string) => Promise<void>
  onDeleteLesson: (lessonId: string) => Promise<void>
  onDeleteActivity: (activityId: string) => Promise<void>
  onMoveUnit: (unitId: string, direction: 'up' | 'down') => Promise<void>
  onMoveLesson: (lessonId: string, direction: 'up' | 'down') => Promise<void>
  onMoveActivity: (activityId: string, direction: 'up' | 'down') => Promise<void>
  onMoveActivityToLesson: (activityId: string, lessonId: string) => Promise<void>
  onToggleUnitVisibility: (unitId: string, visible: boolean) => Promise<void>
  onToggleLessonVisibility: (lessonId: string, visible: boolean) => Promise<void>
  onToggleActivityVisibility: (activityId: string, visible: boolean) => Promise<void>
}

interface ActionMenuItem {
  label: string
  onClick: () => void | Promise<void>
  disabled?: boolean
  danger?: boolean
}

interface ActionMenuProps {
  ariaLabel: string
  items: ActionMenuItem[]
}

const ActionMenu = ({ ariaLabel, items }: ActionMenuProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const visibleItems = items.filter((item) => !item.disabled)

  return (
    <div ref={ref} className="relative">
      <button
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        aria-label={ariaLabel}
      >
        ⋮
      </button>
      {open && visibleItems.length > 0 && (
        <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {visibleItems.map((item) => (
            <button
              key={item.label}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                item.danger ? 'text-rose-600' : 'text-slate-700'
              }`}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface NameDescModalProps {
  open: boolean
  title: string
  confirmLabel: string
  initialName?: string
  initialDescription?: string | null
  onClose: () => void
  onConfirm: (name: string, description: string) => Promise<void>
}

interface MoveActivityModalState {
  activityId: string
  activityTitle: string
  currentLessonId: string
}

const NameDescModal = ({
  open,
  title,
  confirmLabel,
  initialName = '',
  initialDescription = '',
  onClose,
  onConfirm,
}: NameDescModalProps) => {
  const [name, setName] = useState(initialName)
  const [desc, setDesc] = useState(initialDescription ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setName(initialName)
      setDesc(initialDescription ?? '')
      setError(null)
      setSaving(false)
      return
    }

    setName(initialName)
    setDesc(initialDescription ?? '')
    setError(null)
    setSaving(false)
  }, [initialDescription, initialName, open])

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
            {saving ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

interface MoveActivityModalProps {
  open: boolean
  activityTitle: string
  currentLessonId: string
  lessonOptions: Array<{ unitTitle: string; lessonId: string; lessonTitle: string }>
  onClose: () => void
  onConfirm: (lessonId: string) => Promise<void>
}

const MoveActivityModal = ({
  open,
  activityTitle,
  currentLessonId,
  lessonOptions,
  onClose,
  onConfirm,
}: MoveActivityModalProps) => {
  const [targetLessonId, setTargetLessonId] = useState(currentLessonId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSaving(false)
      setError(null)
      setTargetLessonId(currentLessonId)
      return
    }
    setTargetLessonId(currentLessonId)
    setSaving(false)
    setError(null)
  }, [currentLessonId, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Move Assignment</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500"
            aria-label="Close move assignment dialog"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-600">{activityTitle}</p>
        <label htmlFor="move-assignment-target-lesson" className="mb-1 block text-sm font-medium text-slate-700">
          Destination lesson
        </label>
        <select
          id="move-assignment-target-lesson"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          value={targetLessonId}
          onChange={(event) => setTargetLessonId(event.target.value)}
          disabled={saving}
        >
          {lessonOptions.map((option) => (
            <option key={option.lessonId} value={option.lessonId}>
              {option.unitTitle} → {option.lessonTitle}
            </option>
          ))}
        </select>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={saving || targetLessonId === currentLessonId}
            onClick={async () => {
              try {
                setSaving(true)
                setError(null)
                await onConfirm(targetLessonId)
                onClose()
              } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : 'Failed to move assignment')
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Moving…' : 'Move'}
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
  onUpdateUnit,
  onUpdateLesson,
  onUpdateActivity,
  onDeleteUnit,
  onDeleteLesson,
  onDeleteActivity,
  onMoveUnit,
  onMoveLesson,
  onMoveActivity,
  onMoveActivityToLesson,
  onToggleUnitVisibility,
  onToggleLessonVisibility,
  onToggleActivityVisibility,
}: CourseHierarchyProps) => {
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({})
  const [openLessons, setOpenLessons] = useState<Record<string, boolean>>({})
  const [lessonModalUnit, setLessonModalUnit] = useState<string | null>(null)
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [savingActivityId, setSavingActivityId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [moveActivityModal, setMoveActivityModal] = useState<MoveActivityModalState | null>(null)

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

  const editingUnit = editingUnitId ? course.units.find((unit) => unit.id === editingUnitId) ?? null : null
  const editingLesson =
    editingLessonId
      ? course.units.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === editingLessonId) ?? null
      : null

  const getEntry = (activityId: string) =>
    gradebookEntries.find((entry) => entry.activityId === activityId && entry.studentId === currentUserId)

  const confirmAction = (message: string) =>
    typeof window === 'undefined' ? true : window.confirm(message)

  const lessonOptions = course.units.flatMap((unit) =>
    unit.lessons.map((lesson) => ({
      unitTitle: unit.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    })),
  )

  const runAction = async (action: () => Promise<void>) => {
    setActionError(null)
    try {
      await action()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to complete action')
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{course.title} • Units & Lessons</h3>
        </div>
        {actionError && (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {actionError}
          </p>
        )}

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {course.units.map((unit, unitIndex) => {
            const unitActivities = unit.lessons.flatMap((lesson) => lesson.activities)
            const completedCount = unitActivities.filter((activity) => {
              const entry = getEntry(activity.id)
              return Boolean(
                entry?.submitted || (entry?.pointsEarned !== null && entry?.pointsEarned !== undefined),
              )
            }).length
            const unitVisible = unit.visible !== false

            return (
              <div
                key={unit.id}
                className={`rounded-xl border border-slate-200 ${
                  isTeacher && !unitVisible ? 'bg-slate-200/70 shadow-inner' : 'bg-white'
                }`}
              >
                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    className="flex items-center gap-2 text-left font-medium text-slate-800"
                    onClick={() =>
                      setOpenUnits((previous) => ({ ...previous, [unit.id]: !previous[unit.id] }))
                    }
                  >
                    <span>{openUnits[unit.id] ? '▾' : '▸'}</span>
                    <span>{unit.title}</span>
                    {isTeacher && !unitVisible && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Hidden</span>
                    )}
                    {!isTeacher && unitActivities.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {completedCount}/{unitActivities.length}
                      </span>
                    )}
                  </button>
                  {isTeacher && (
                    <div className="self-end sm:self-auto">
                      <ActionMenu
                        ariaLabel={`Actions for unit ${unit.title}`}
                        items={[
                          { label: 'Add lesson', onClick: () => setLessonModalUnit(unit.id) },
                          { label: 'Edit', onClick: () => setEditingUnitId(unit.id) },
                          {
                            label: unitVisible ? 'Hide' : 'Show',
                            onClick: () => runAction(() => onToggleUnitVisibility(unit.id, !unitVisible)),
                          },
                          {
                            label: 'Move up',
                            onClick: () => runAction(() => onMoveUnit(unit.id, 'up')),
                            disabled: unitIndex === 0,
                          },
                          {
                            label: 'Move down',
                            onClick: () => runAction(() => onMoveUnit(unit.id, 'down')),
                            disabled: unitIndex === course.units.length - 1,
                          },
                          {
                            label: 'Delete',
                            danger: true,
                            onClick: () => {
                              if (
                                confirmAction(
                                  `Delete "${unit.title}" and all of its lessons and activities? This cannot be undone.`,
                                )
                              ) {
                                void runAction(() => onDeleteUnit(unit.id))
                              }
                            },
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
                {openUnits[unit.id] && (
                  <div className="space-y-2 border-t border-slate-100 p-3">
                    {unit.lessons.map((lesson, lessonIndex) => {
                      const lessonVisible = lesson.visible !== false

                      return (
                        <div
                          key={lesson.id}
                          className={`rounded-lg border border-slate-200 ${
                            isTeacher && !lessonVisible ? 'bg-slate-200/70 shadow-inner' : 'bg-white'
                          }`}
                        >
                          <div className="flex flex-col gap-3 p-2.5 sm:flex-row sm:items-center sm:justify-between">
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
                              {isTeacher && !lessonVisible && (
                                <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                                  Hidden
                                </span>
                              )}
                            </button>
                            {isTeacher && (
                              <div className="self-end sm:self-auto">
                                <ActionMenu
                                  ariaLabel={`Actions for lesson ${lesson.title}`}
                                  items={[
                                    { label: 'Edit', onClick: () => setEditingLessonId(lesson.id) },
                                    {
                                      label: lessonVisible ? 'Hide' : 'Show',
                                      onClick: () => runAction(() => onToggleLessonVisibility(lesson.id, !lessonVisible)),
                                    },
                                    {
                                      label: 'Move up',
                                      onClick: () => runAction(() => onMoveLesson(lesson.id, 'up')),
                                      disabled: lessonIndex === 0,
                                    },
                                    {
                                      label: 'Move down',
                                      onClick: () => runAction(() => onMoveLesson(lesson.id, 'down')),
                                      disabled: lessonIndex === unit.lessons.length - 1,
                                    },
                                    {
                                      label: 'Delete',
                                      danger: true,
                                      onClick: () => {
                                        if (
                                          confirmAction(
                                            `Delete "${lesson.title}" and all of its activities? This cannot be undone.`,
                                          )
                                        ) {
                                          void runAction(() => onDeleteLesson(lesson.id))
                                        }
                                      },
                                    },
                                  ]}
                                />
                              </div>
                            )}
                          </div>
                          {openLessons[lesson.id] && (
                            <div className="space-y-2 border-t border-slate-100 p-3">
                              {lesson.activities
                                .filter((activity) => isTeacher || activity.visible !== false)
                                .map((activity, activityIndex) => (
                                  <div
                                    key={activity.id}
                                    className={`rounded-lg p-2.5 ${
                                      activity.visible === false
                                        ? 'bg-slate-300/60 ring-1 ring-slate-300'
                                        : 'bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="min-w-0 flex-1">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                          {activity.visible === false && (
                                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                                              Hidden
                                            </span>
                                          )}
                                          <span className="text-xs text-slate-500">
                                            {activity.points} pts
                                            {activity.dueDate ? ` · Due ${activity.dueDate}` : ''}
                                          </span>
                                        </div>
                                        <ActivityCard
                                          activity={activity}
                                          currentUserId={currentUserId}
                                          isTeacher={isTeacher}
                                          gradebookEntries={gradebookEntries}
                                          onSelect={onActivitySelect}
                                        />
                                      </div>
                                      {isTeacher && (
                                        <div className="self-end sm:self-auto">
                                          <ActionMenu
                                            ariaLabel={`Actions for assignment ${activity.title}`}
                                            items={[
                                              {
                                                label: 'Edit',
                                                onClick: () => onUpdateActivity(activity.id),
                                              },
                                              {
                                                label: activity.visible === false ? 'Show' : 'Hide',
                                                onClick: async () => {
                                                  try {
                                                    setSavingActivityId(activity.id)
                                                    await runAction(() =>
                                                      onToggleActivityVisibility(activity.id, activity.visible === false),
                                                    )
                                                  } finally {
                                                    setSavingActivityId(null)
                                                  }
                                                },
                                              },
                                              {
                                                label: 'Move up',
                                                onClick: () => runAction(() => onMoveActivity(activity.id, 'up')),
                                                disabled: activityIndex === 0 || savingActivityId === activity.id,
                                              },
                                              {
                                                label: 'Move down',
                                                onClick: () => runAction(() => onMoveActivity(activity.id, 'down')),
                                                disabled:
                                                  activityIndex === lesson.activities.length - 1
                                                  || savingActivityId === activity.id,
                                              },
                                              {
                                                label: 'Move…',
                                                onClick: () =>
                                                  setMoveActivityModal({
                                                    activityId: activity.id,
                                                    activityTitle: activity.title,
                                                    currentLessonId: lesson.id,
                                                  }),
                                                disabled: lessonOptions.length <= 1 || savingActivityId === activity.id,
                                              },
                                              {
                                                label: 'Delete',
                                                danger: true,
                                                onClick: () => {
                                                  if (
                                                    confirmAction(
                                                      `Delete "${activity.title}"? This cannot be undone.`,
                                                    )
                                                  ) {
                                                    void runAction(() => onDeleteActivity(activity.id))
                                                  }
                                                },
                                              },
                                            ]}
                                          />
                                        </div>
                                      )}
                                    </div>
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
                      )
                    })}
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
        confirmLabel="Create"
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
        confirmLabel="Create"
        onClose={() => setUnitModalOpen(false)}
        onConfirm={async (name, description) => {
          const unitId = await onCreateUnit(name, description)
          setOpenUnits((previous) => ({ ...previous, [unitId]: true }))
        }}
      />

      <NameDescModal
        open={editingUnit !== null}
        title="Edit Unit"
        confirmLabel="Save changes"
        initialName={editingUnit?.title}
        initialDescription={editingUnit?.description}
        onClose={() => setEditingUnitId(null)}
        onConfirm={async (name, description) => {
          if (!editingUnit) return
          await onUpdateUnit(editingUnit.id, name, description)
        }}
      />

      <NameDescModal
        open={editingLesson !== null}
        title="Edit Lesson"
        confirmLabel="Save changes"
        initialName={editingLesson?.title}
        initialDescription={editingLesson?.description}
        onClose={() => setEditingLessonId(null)}
        onConfirm={async (name, description) => {
          if (!editingLesson) return
          await onUpdateLesson(editingLesson.id, name, description)
        }}
      />

      <MoveActivityModal
        open={moveActivityModal !== null}
        activityTitle={moveActivityModal?.activityTitle ?? ''}
        currentLessonId={moveActivityModal?.currentLessonId ?? ''}
        lessonOptions={lessonOptions}
        onClose={() => setMoveActivityModal(null)}
        onConfirm={async (lessonId) => {
          if (!moveActivityModal) return
          setActionError(null)
          await onMoveActivityToLesson(moveActivityModal.activityId, lessonId)
        }}
      />
    </>
  )
}
