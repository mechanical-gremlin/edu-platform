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
}

export const CoursesPage = ({ user, courses, gradebookEntries, onCourseOpen, onCreateCourse }: CoursesPageProps) => {
  const [showCreate, setShowCreate] = useState(false)

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            progress={getCourseProgress(course, user.id, gradebookEntries)}
            onOpen={() => onCourseOpen(course.id)}
          />
        ))}
      </div>
      {showCreate && onCreateCourse && (
        <CourseCreationModal
          onClose={() => setShowCreate(false)}
          onCreate={onCreateCourse}
        />
      )}
    </section>
  )
}
