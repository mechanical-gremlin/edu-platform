import { CourseHierarchy } from '../components/hierarchy/CourseHierarchy'
import { ActivityCreationModal } from '../components/teacher/ActivityCreationModal'
import type { Course, User } from '../types/models'

interface CoursePageProps {
  user: User
  course: Course
  onActivitySelect: (activityId: string) => void
  modalOpen: boolean
  onModalOpen: () => void
  onModalClose: () => void
}

export const CoursePage = ({
  user,
  course,
  onActivitySelect,
  modalOpen,
  onModalOpen,
  onModalClose,
}: CoursePageProps) => (
  <section className="space-y-4">
    <h2 className="text-2xl font-bold text-slate-900">{course.title}</h2>
    <p className="text-sm text-slate-500">{course.code} · {course.teacherName}</p>
    <CourseHierarchy
      course={course}
      isTeacher={user.role === 'teacher'}
      onActivitySelect={onActivitySelect}
      onCreateActivity={onModalOpen}
    />
    <ActivityCreationModal open={modalOpen && user.role === 'teacher'} onClose={onModalClose} />
  </section>
)

