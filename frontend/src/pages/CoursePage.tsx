import { useState } from 'react'
import { ActivityCreationModal } from '../components/teacher/ActivityCreationModal'
import { RosterModal } from '../components/teacher/RosterModal'
import { CourseHierarchy } from '../components/hierarchy/CourseHierarchy'
import type { Course, CreateActivityInput, GradebookEntry, User } from '../types/models'

interface CoursePageProps {
  user: User
  course: Course
  gradebookEntries: GradebookEntry[]
  onBack: () => void
  onActivitySelect: (activityId: string) => void
  onCreateUnit: (courseId: string, title: string, description: string) => Promise<string>
  onCreateLesson: (unitId: string, title: string, description: string) => Promise<string>
  onCreateActivity: (lessonId: string, input: CreateActivityInput) => Promise<string>
  onToggleActivityVisibility: (activityId: string, visible: boolean) => Promise<void>
  onAddEnrollment?: (courseId: string, userId: string, role: 'teacher' | 'student') => Promise<void>
  fetchUsers?: () => Promise<User[]>
}

export const CoursePage = ({
  user,
  course,
  gradebookEntries,
  onBack,
  onActivitySelect,
  onCreateUnit,
  onCreateLesson,
  onCreateActivity,
  onToggleActivityVisibility,
  onAddEnrollment,
  fetchUsers,
}: CoursePageProps) => {
  const [activityModalLessonId, setActivityModalLessonId] = useState<string | null>(null)
  const [rosterOpen, setRosterOpen] = useState(false)

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={onBack}
          >
            ← Back to courses
          </button>
          <h2 className="text-2xl font-bold text-slate-900">{course.title}</h2>
          <p className="text-sm text-slate-500">
            {course.code} · {course.teacherName}
          </p>
        </div>
        {user.role === 'teacher' && onAddEnrollment && fetchUsers && (
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => setRosterOpen(true)}
          >
            👥 Manage Roster
          </button>
        )}
      </div>
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
      {rosterOpen && onAddEnrollment && fetchUsers && (
        <RosterModal
          courseId={course.id}
          courseTitle={course.title}
          currentUserId={user.id}
          onClose={() => setRosterOpen(false)}
          onAddEnrollment={onAddEnrollment}
          fetchUsers={fetchUsers}
        />
      )}
    </section>
  )
}
