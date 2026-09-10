import { useState, useRef, useEffect } from 'react'
import { ActivityCard } from '../activity/ActivityCard'
import type { Course } from '../../types/models'

interface CourseHierarchyProps {
  course: Course
  isTeacher: boolean
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

export const CourseHierarchy = ({
  course,
  isTeacher,
  onActivitySelect,
  onCreateActivity,
}: CourseHierarchyProps) => {
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({})
  const [openLessons, setOpenLessons] = useState<Record<string, boolean>>({})

  const toggleUnit = (unitId: string) => setOpenUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }))
  const toggleLesson = (lessonId: string) =>
    setOpenLessons((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }))

  return (
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
                  onEdit={() => {}}
                  onDelete={() => {}}
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
                          onEdit={() => {}}
                          onDelete={() => {}}
                        />
                      )}
                    </div>
                    {openLessons[lesson.id] && (
                      <div className="space-y-2 border-t border-slate-100 p-3">
                        {lesson.activities.map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
                            <ActivityCard activity={activity} onSelect={onActivitySelect} />
                            {isTeacher && (
                              <ActionMenu
                                onAdd={onCreateActivity}
                                onEdit={() => {}}
                                onDelete={() => {}}
                              />
                            )}
                          </div>
                        ))}
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
                  <button className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700">
                    + Add new lesson
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {isTeacher && (
        <button className="mt-4 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700">
          + Add new unit
        </button>
      )}
    </div>
  )
}

