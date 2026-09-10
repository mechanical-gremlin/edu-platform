export type UserRole = 'teacher' | 'student'

export type ActivityType = 'video' | 'coding' | 'quiz' | 'project' | 'godot'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl: string
}

export interface Activity {
  id: string
  title: string
  type: ActivityType
  dueDate: string
  points: number
  description: string
  resourceUrl?: string
  statusByUser: Record<string, 'not_started' | 'in_progress' | 'completed'>
  visible?: boolean
}

export interface Lesson {
  id: string
  title: string
  activities: Activity[]
}

export interface Unit {
  id: string
  title: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  code: string
  teacherName: string
  units: Unit[]
}

export interface GradebookEntry {
  studentId: string
  studentName: string
  courseId: string
  activityId: string
  activityTitle: string
  pointsEarned: number | null
  pointsPossible: number
  submitted?: boolean
  comment?: string
}
