import { useState } from 'react'
import { ActivityCreationModal } from '../components/teacher/ActivityCreationModal'
import { CourseHierarchy } from '../components/hierarchy/CourseHierarchy'
import type { Course, CreateActivityInput, GradebookEntry, User } from '../types/models'

interface CoursePageProps {
  user: User
  course: Course
  gradebookEntries: GradebookEntry[]
  onActivitySelect: (activityId: string) => void
  onCreateUnit: (courseId: string, title: string, description: string) => Promise<string>
  onCreateLesson: (unitId: string, title: string, description: string) => Promise<string>
  onCreateActivity: (lessonId: string, input: CreateActivityInput) => Promise<string>
  onToggleActivityVisibility: (activityId: string, visible: boolean) => Promise<void>
}

export const CoursePage = ({
  user,
  course,
  gradebookEntries,
  onActivitySelect,
  onCreateUnit,
  onCreateLesson,
  onCreateActivity,
  onToggleActivityVisibility,
}: CoursePageProps) => {
  const [activityModalLessonId, setActivityModalLessonId] = useState<string | null>(null)

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">{course.title}</h2>
      <p className="text-sm text-slate-500">
        {course.code} · {course.teacherName}
      </p>
      <CourseHierarchy
        course={course}
        isTeacher={user.role === 'teacher'}
        currentUserId={user.id}
        gradebookEntries={gradebookEntries}
        onActivitySelect={onActivitySelect}
        onCreateUnit={(title, description) => onCreateUnit(course.id, title, description)}
        onCreateLesson={onCreateLesson}
        onCreateActivity={(lessonId) => setActivityModalLessonId(lessonId)}
        onToggleActivityVisibility={onToggleActivityVisibility}
      />
      <ActivityCreationModal
        open={activityModalLessonId !== null && user.role === 'teacher'}
        onClose={() => setActivityModalLessonId(null)}
        onSave={async (input) => {
          if (!activityModalLessonId) return
          await onCreateActivity(activityModalLessonId, input)
          setActivityModalLessonId(null)
        }}
      />
    </section>
  )
}
