import { CourseCard } from '../components/dashboard/CourseCard'
import { getCourseProgress } from '../utils/progress'
import type { Course, User } from '../types/models'

interface DashboardPageProps {
  user: User
  courses: Course[]
  onCourseOpen: (courseId: string) => void
}

export const DashboardPage = ({ user, courses, onCourseOpen }: DashboardPageProps) => (
  <section>
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{user.role === 'teacher' ? 'Teacher' : 'Student'} Dashboard</h2>
      <p className="text-sm text-slate-600">Select a course to open its units, lessons, and activities.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          progress={getCourseProgress(course, user.id)}
          onOpen={() => onCourseOpen(course.id)}
        />
      ))}
    </div>
  </section>
)
