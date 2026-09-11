import { CourseCard } from '../components/dashboard/CourseCard'
import { getCourseProgress } from '../utils/progress'
import type { Course, GradebookEntry, User } from '../types/models'

interface CoursesPageProps {
  user: User
  courses: Course[]
  gradebookEntries: GradebookEntry[]
  onCourseOpen: (courseId: string) => void
}

export const CoursesPage = ({ user, courses, gradebookEntries, onCourseOpen }: CoursesPageProps) => (
  <section className="space-y-4">
    <div>
      <h2 className="text-2xl font-bold text-slate-900">My Courses</h2>
      <p className="mt-1 text-sm text-slate-600">Select a course to view its units, lessons, and activities.</p>
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
  </section>
)
