import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
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
  updateGradebookEntry: (studentId: string, activityId: string, points: number, comment: string) => void
}

export const AppContext = createContext<AppContextValue | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [gradebookEntries, setGradebookEntries] = useState<GradebookEntry[]>(mockGradebookEntries)

  const updateGradebookEntry = useCallback(
    (studentId: string, activityId: string, points: number, comment: string) => {
      setGradebookEntries((prev) =>
        prev.map((e) =>
          e.studentId === studentId && e.activityId === activityId
            ? { ...e, pointsEarned: points, comment, submitted: true }
            : e,
        ),
      )
    },
    [],
  )

  const value = useMemo(
    () => ({
      users: mockUsers,
      courses: mockCourses,
      gradebookEntries,
      currentUser,
      selectedCourseId,
      selectedActivityId,
      setCurrentUser,
      setSelectedCourseId,
      setSelectedActivityId,
      updateGradebookEntry,
    }),
    [currentUser, selectedActivityId, selectedCourseId, gradebookEntries, updateGradebookEntry],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
