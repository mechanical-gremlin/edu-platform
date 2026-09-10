import { createContext, useMemo, useState, type ReactNode } from 'react'
import { mockCourses, mockGradebookEntries, mockUsers } from '../mocks/data'
import type { Course, GradebookEntry, User } from '../types/models'

interface AppContextValue {
  users: User[]
  courses: Course[]
  gradebookEntries: GradebookEntry[]
  currentUser: User | null
  selectedCourseId: string | null
  selectedActivityId: string | null
  setCurrentUser: (user: User | null) => void
  setSelectedCourseId: (courseId: string | null) => void
  setSelectedActivityId: (activityId: string | null) => void
}

export const AppContext = createContext<AppContextValue | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)

  const value = useMemo(
    () => ({
      users: mockUsers,
      courses: mockCourses,
      gradebookEntries: mockGradebookEntries,
      currentUser,
      selectedCourseId,
      selectedActivityId,
      setCurrentUser,
      setSelectedCourseId,
      setSelectedActivityId,
    }),
    [currentUser, selectedActivityId, selectedCourseId],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
