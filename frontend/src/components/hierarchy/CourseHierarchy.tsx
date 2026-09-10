import { useState } from 'react'
import { ActivityCard } from '../activity/ActivityCard'
import type { Course } from '../../types/models'

interface CourseHierarchyProps {
  course: Course
  isTeacher: boolean
  onActivitySelect: (activityId: string) => void
  onCreateActivity: () => void
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
                <div className="flex gap-2 text-xs">
                  <button className="rounded bg-slate-100 px-2 py-1">Add</button>
                  <button className="rounded bg-slate-100 px-2 py-1">Edit</button>
                  <button className="rounded bg-red-100 px-2 py-1 text-red-700">Delete</button>
                </div>
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
                        <div className="flex gap-2 text-xs">
                          <button className="rounded bg-slate-100 px-2 py-1">Add</button>
                          <button className="rounded bg-slate-100 px-2 py-1">Edit</button>
                          <button className="rounded bg-red-100 px-2 py-1 text-red-700">Delete</button>
                        </div>
                      )}
                    </div>
                    {openLessons[lesson.id] && (
                      <div className="space-y-2 border-t border-slate-100 p-3">
                        {lesson.activities.map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
                            <ActivityCard activity={activity} onSelect={onActivitySelect} />
                            {isTeacher && (
                              <div className="flex gap-2 text-xs">
                                <button
                                  className="rounded bg-indigo-100 px-2 py-1 text-indigo-700"
                                  onClick={onCreateActivity}
                                >
                                  Add
                                </button>
                                <button className="rounded bg-slate-200 px-2 py-1">Edit</button>
                                <button className="rounded bg-red-100 px-2 py-1 text-red-700">Delete</button>
                              </div>
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
