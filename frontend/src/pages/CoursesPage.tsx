import { useState } from 'react'
import { CourseCard } from '../components/dashboard/CourseCard'
import { CourseCreationModal } from '../components/teacher/CourseCreationModal'
import { getCourseProgress } from '../utils/progress'
import type { Course, GradebookEntry, User } from '../types/models'

interface CoursesPageProps {
  user: User
  courses: Course[]
  gradebookEntries: GradebookEntry[]
  onCourseOpen: (courseId: string) => void
  onCreateCourse?: (title: string, code: string, description: string) => Promise<void>
  onUpdateCourse?: (courseId: string, title: string, code: string, description: string) => Promise<void>
  onDeleteCourse?: (courseId: string) => Promise<void>
  onMoveCourse?: (courseId: string, direction: 'up' | 'down') => Promise<void>
  onToggleCourseVisibility?: (courseId: string, visible: boolean) => Promise<void>
}

export const CoursesPage = ({
  user,
  courses,
  gradebookEntries,
  onCourseOpen,
  onCreateCourse,
  onUpdateCourse,
  onDeleteCourse,
  onMoveCourse,
  onToggleCourseVisibility,
}: CoursesPageProps) => {
  const [showCreate, setShowCreate] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const editingCourse = courses.find((course) => course.id === editingCourseId) ?? null
  const confirmAction = (message: string) => (typeof window === 'undefined' ? true : window.confirm(message))
  const runAction = async (action: () => Promise<void>) => {
    setActionError(null)
    try {
      await action()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to complete course action')
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Courses</h2>
          <p className="mt-1 text-sm text-slate-600">Select a course to view its units, lessons, and activities.</p>
        </div>
        {user.role === 'teacher' && onCreateCourse && (
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            onClick={() => setShowCreate(true)}
          >
            + New Course
          </button>
        )}
      </div>
      {actionError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {actionError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            progress={getCourseProgress(course, user.id, gradebookEntries)}
            onOpen={() => onCourseOpen(course.id)}
            actionItems={
              user.role === 'teacher' && onUpdateCourse && onDeleteCourse && onMoveCourse && onToggleCourseVisibility
                ? [
                    { label: 'Edit', onClick: () => setEditingCourseId(course.id) },
                    {
                      label: course.visible === false ? 'Show' : 'Hide',
                      onClick: () => runAction(() => onToggleCourseVisibility(course.id, course.visible === false)),
                    },
                    {
                      label: 'Move up',
                      onClick: () => runAction(() => onMoveCourse(course.id, 'up')),
                      disabled: courses[0]?.id === course.id,
                    },
                    {
                      label: 'Move down',
                      onClick: () => runAction(() => onMoveCourse(course.id, 'down')),
                      disabled: courses[courses.length - 1]?.id === course.id,
                    },
                    {
                      label: 'Delete',
                      danger: true,
                      onClick: () => {
                        if (confirmAction(`Delete "${course.title}" and all of its units, lessons, and activities? This cannot be undone.`)) {
                          return runAction(() => onDeleteCourse(course.id))
                        }
                      },
                    },
                  ]
                : []
            }
          />
        ))}
      </div>
      {showCreate && onCreateCourse && (
        <CourseCreationModal
          onClose={() => setShowCreate(false)}
          onCreate={onCreateCourse}
        />
      )}
      {editingCourse && onUpdateCourse && (
        <CourseCreationModal
          onClose={() => setEditingCourseId(null)}
          initialValues={editingCourse}
          titleText="Edit Course"
          submitLabel="Save changes"
          onCreate={async (title, code, description) => {
            await onUpdateCourse(editingCourse.id, title, code, description)
            setEditingCourseId(null)
          }}
        />
      )}
    </section>
  )
}
