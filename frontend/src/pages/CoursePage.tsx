import { ActivityDetail } from '../components/activity/ActivityDetail'
import { CourseHierarchy } from '../components/hierarchy/CourseHierarchy'
import { ActivityCreationModal } from '../components/teacher/ActivityCreationModal'
import type { Course, User } from '../types/models'

interface CoursePageProps {
  user: User
  course: Course
  selectedActivityId: string | null
  onActivitySelect: (activityId: string) => void
  modalOpen: boolean
  onModalOpen: () => void
  onModalClose: () => void
}

export const CoursePage = ({
  user,
  course,
  selectedActivityId,
  onActivitySelect,
  modalOpen,
  onModalOpen,
  onModalClose,
}: CoursePageProps) => {
  const selectedActivity = course.units
    .flatMap((unit) => unit.lessons)
    .flatMap((lesson) => lesson.activities)
    .find((activity) => activity.id === selectedActivityId)

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Course View: {course.title}</h2>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <CourseHierarchy
          course={course}
          isTeacher={user.role === 'teacher'}
          onActivitySelect={onActivitySelect}
          onCreateActivity={onModalOpen}
        />
        <ActivityDetail activity={selectedActivity ?? null} />
      </div>
      <ActivityCreationModal open={modalOpen && user.role === 'teacher'} onClose={onModalClose} />
    </section>
  )
}
