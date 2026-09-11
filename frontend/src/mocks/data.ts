import type { Course, GradebookEntry, User } from '../types/models'

export const mockUsers: User[] = [
  {
    id: 't-1',
    name: 'Ms. Ramirez',
    email: 'teacher@example.edu',
    role: 'teacher',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=MR',
  },
  {
    id: 's-1',
    name: 'Avery Chen',
    email: 'student@example.edu',
    role: 'student',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=AC',
  },
  {
    id: 's-2',
    name: 'Jordan Kim',
    email: 'jordan@example.edu',
    role: 'student',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=JK',
  },
  {
    id: 's-3',
    name: 'Priya Patel',
    email: 'priya@example.edu',
    role: 'student',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=PP',
  },
  {
    id: 's-4',
    name: 'Marcus Williams',
    email: 'marcus@example.edu',
    role: 'student',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=MW',
  },
]

export const mockCourses: Course[] = [
  {
    id: 'c-1',
    title: 'Game Development with Godot',
    code: 'CSP-201',
    teacherName: 'Ms. Ramirez',
    units: [],
  },
]

export const mockGradebookEntries: GradebookEntry[] = []
