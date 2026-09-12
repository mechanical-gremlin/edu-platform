export type UserRole = 'teacher' | 'student' | 'school_admin' | 'system_admin'

export type ActivityType = 'video' | 'coding' | 'quiz' | 'project' | 'godot'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl: string
}

export interface StarterFile {
  name: string
  language: string
  content: string
}

export interface Activity {
  id: string
  title: string
  type: ActivityType
  dueDate: string
  points: number
  description: string
  directions?: string | null
  language?: string | null
  languageLocked?: boolean
  starterCode?: string | null
  starterFiles?: StarterFile[] | null
  expectedOutput?: string | null
  resourceUrl?: string | null
  visible?: boolean
}

export interface Lesson {
  id: string
  title: string
  description?: string | null
  activities: Activity[]
}

export interface Unit {
  id: string
  title: string
  description?: string | null
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  code: string
  teacherName: string
  description?: string | null
  units: Unit[]
}

export interface GradebookEntry {
  studentId: string
  studentName: string
  courseId: string
  courseCode?: string
  courseTitle?: string
  activityId: string
  activityTitle: string
  pointsEarned: number | null
  pointsPossible: number
  submitted?: boolean
  comment?: string | null
  gradedAt?: string | null
  submittedAt?: string | null
  submissionText?: string | null
}

export interface CreateActivityInput {
  title: string
  type: ActivityType
  description: string
  directions?: string | null
  language?: string | null
  languageLocked?: boolean
  starterCode?: string | null
  starterFiles?: StarterFile[] | null
  expectedOutput?: string | null
  dueAt?: string | null
  pointsPossible: number
  resourceUrl?: string | null
  visible?: boolean
}

export interface CreateCourseInput {
  title: string
  code: string
  description?: string | null
}

export interface AddEnrollmentInput {
  userId: string
  role?: 'teacher' | 'student'
}

export interface UpdateActivityDirectionsInput {
  directions?: string | null
}
