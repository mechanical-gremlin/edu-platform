import { useState } from 'react'
import { ActivityCreationModal } from '../components/teacher/ActivityCreationModal'
import { ActivityEditModal } from '../components/teacher/ActivityEditModal'
import { RosterModal } from '../components/teacher/RosterModal'
import { CourseHierarchy } from '../components/hierarchy/CourseHierarchy'
import type { Course, CreateActivityInput, GradebookEntry, UpdateActivityInput, User } from '../types/models'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

interface CoursePageProps {
  user: User
  course: Course
  gradebookEntries: GradebookEntry[]
  onBack: () => void
  onActivitySelect: (activityId: string) => void
  onCreateUnit: (courseId: string, title: string, description: string) => Promise<string>
  onCreateLesson: (unitId: string, title: string, description: string) => Promise<string>
  onCreateActivity: (lessonId: string, input: CreateActivityInput) => Promise<string>
  onUpdateUnit: (unitId: string, title: string, description: string) => Promise<void>
  onUpdateLesson: (lessonId: string, title: string, description: string) => Promise<void>
  onUpdateActivity: (activityId: string, input: UpdateActivityInput) => Promise<void>
  onDeleteUnit: (unitId: string) => Promise<void>
  onDeleteLesson: (lessonId: string) => Promise<void>
  onDeleteActivity: (activityId: string) => Promise<void>
  onMoveUnit: (unitId: string, direction: 'up' | 'down') => Promise<void>
  onMoveLesson: (lessonId: string, direction: 'up' | 'down') => Promise<void>
  onMoveActivity: (activityId: string, direction: 'up' | 'down') => Promise<void>
  onToggleUnitVisibility: (unitId: string, visible: boolean) => Promise<void>
  onToggleLessonVisibility: (lessonId: string, visible: boolean) => Promise<void>
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
  onUpdateUnit,
  onUpdateLesson,
  onUpdateActivity,
  onDeleteUnit,
  onDeleteLesson,
  onDeleteActivity,
  onMoveUnit,
  onMoveLesson,
  onMoveActivity,
  onToggleUnitVisibility,
  onToggleLessonVisibility,
  onToggleActivityVisibility,
  onAddEnrollment,
  fetchUsers,
}: CoursePageProps) => {
  const [activityModalLessonId, setActivityModalLessonId] = useState<string | null>(null)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [rosterOpen, setRosterOpen] = useState(false)
  const editingActivity =
    editingActivityId
      ? course.units
          .flatMap((unit) => unit.lessons)
          .flatMap((lesson) => lesson.activities)
          .find((activity) => activity.id === editingActivityId) ?? null
      : null

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
        onUpdateUnit={onUpdateUnit}
        onUpdateLesson={onUpdateLesson}
        onUpdateActivity={(activityId) => setEditingActivityId(activityId)}
        onDeleteUnit={onDeleteUnit}
        onDeleteLesson={onDeleteLesson}
        onDeleteActivity={onDeleteActivity}
        onMoveUnit={onMoveUnit}
        onMoveLesson={onMoveLesson}
        onMoveActivity={onMoveActivity}
        onToggleUnitVisibility={onToggleUnitVisibility}
        onToggleLessonVisibility={onToggleLessonVisibility}
        onToggleActivityVisibility={onToggleActivityVisibility}
      />
      <ActivityCreationModal
        open={activityModalLessonId !== null && user.role === 'teacher'}
        onClose={() => setActivityModalLessonId(null)}
        executeUrl={apiBaseUrl ? `${apiBaseUrl}/execute` : undefined}
        runUserId={user.id}
        onSave={async (input) => {
          if (!activityModalLessonId) return
          await onCreateActivity(activityModalLessonId, input)
          setActivityModalLessonId(null)
        }}
      />
      <ActivityEditModal
        open={editingActivity !== null && user.role === 'teacher'}
        activity={editingActivity}
        onClose={() => setEditingActivityId(null)}
        onSave={async (input) => {
          if (!editingActivityId) return
          await onUpdateActivity(editingActivityId, input)
          setEditingActivityId(null)
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
