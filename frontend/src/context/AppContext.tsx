import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { mockUsers } from '../mocks/data'
import type {
  Course,
  CreateActivityInput,
  GradebookEntry,
  UpdateActivityDirectionsInput,
  User,
} from '../types/models'

interface AppContextValue {
  users: User[]
  courses: Course[]
  gradebookEntries: GradebookEntry[]
  currentUser: User | null
  selectedCourseId: string | null
  selectedActivityId: string | null
  loading: boolean
  error: string | null
  setCurrentUser: (user: User | null) => void
  setSelectedCourseId: (courseId: string | null) => void
  setSelectedActivityId: (activityId: string | null) => void
  refreshData: () => Promise<void>
  createUnit: (courseId: string, title: string, description: string) => Promise<string>
  createLesson: (unitId: string, title: string, description: string) => Promise<string>
  createActivity: (lessonId: string, input: CreateActivityInput) => Promise<string>
  toggleActivityVisibility: (activityId: string, visible: boolean) => Promise<void>
  submitActivity: (activityId: string, responseText: string) => Promise<void>
  updateGradebookEntry: (
    studentId: string,
    activityId: string,
    points: number,
    comment: string,
  ) => Promise<void>
  updateActivityDirections: (
    activityId: string,
    input: UpdateActivityDirectionsInput,
  ) => Promise<void>
}

interface ApiCourseListItem {
  id: string
  title: string
  code: string
  description: string | null
  teacherName: string | null
}

interface ApiActivity {
  id: string
  title: string
  type: Course['units'][number]['lessons'][number]['activities'][number]['type']
  description: string
  directions: string | null
  resourceUrl: string | null
  visible: boolean
  dueAt: string | null
  pointsPossible: number
}

interface ApiCourse {
  id: string
  title: string
  code: string
  description: string | null
  teacherName: string | null
  units: Array<{
    id: string
    title: string
    description: string | null
    lessons: Array<{
      id: string
      title: string
      description: string | null
      activities: ApiActivity[]
    }>
  }>
}

interface ApiTeacherGradebook {
  courseId: string
  activities: Array<{
    id: string
    title: string
    pointsPossible: number
    visible: boolean
  }>
  students: Array<{
    id: string
    name: string
    grades: Array<{
      activityId: string
      submitted: boolean
      pointsEarned: number | null
      pointsPossible: number
      comment: string | null
      gradedAt: string | null
      submittedAt: string | null
      submissionText: string | null
    }>
  }>
}

interface ApiStudentGrade {
  courseId: string
  courseCode: string
  courseTitle: string
  activityId: string
  activityTitle: string
  pointsEarned: number | null
  pointsPossible: number
  submitted: boolean
  comment: string | null
  gradedAt: string | null
  submittedAt: string | null
  submissionText: string | null
}

interface MutationResponse {
  id: string
  title?: string
  description?: string | null
}

const updateCoursesForActivity = (
  courses: Course[],
  activityId: string,
  updater: (activity: Course['units'][number]['lessons'][number]['activities'][number]) => Course['units'][number]['lessons'][number]['activities'][number],
) =>
  courses.map((course) => ({
    ...course,
    units: course.units.map((unit) => ({
      ...unit,
      lessons: unit.lessons.map((lesson) => ({
        ...lesson,
        activities: lesson.activities.map((activity) =>
          activity.id === activityId ? updater(activity) : activity,
        ),
      })),
    })),
  }))

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

const withDateOnly = (value: string | null) => value?.slice(0, 10) ?? ''

const mapCourse = (course: ApiCourse): Course => ({
  id: course.id,
  title: course.title,
  code: course.code,
  description: course.description,
  teacherName: course.teacherName ?? 'Unassigned',
  units: course.units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    description: unit.description,
    lessons: unit.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      activities: lesson.activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        type: activity.type,
        description: activity.description,
        directions: activity.directions,
        resourceUrl: activity.resourceUrl,
        visible: activity.visible,
        dueDate: withDateOnly(activity.dueAt),
        points: activity.pointsPossible,
      })),
    })),
  })),
})

const mapTeacherGradebookEntries = (
  gradebook: ApiTeacherGradebook,
  courseLookup: Map<string, Course>,
): GradebookEntry[] => {
  const course = courseLookup.get(gradebook.courseId)
  const activityLookup = new Map(gradebook.activities.map((activity) => [activity.id, activity]))

  return gradebook.students.flatMap((student) =>
    student.grades.map((grade) => ({
      studentId: student.id,
      studentName: student.name,
      courseId: gradebook.courseId,
      courseCode: course?.code,
      courseTitle: course?.title,
      activityId: grade.activityId,
      activityTitle: activityLookup.get(grade.activityId)?.title ?? 'Untitled activity',
      pointsEarned: grade.pointsEarned,
      pointsPossible: grade.pointsPossible,
      submitted: grade.submitted,
      comment: grade.comment,
      gradedAt: grade.gradedAt,
      submittedAt: grade.submittedAt,
      submissionText: grade.submissionText,
    })),
  )
}

const mapStudentGradebookEntries = (
  grades: ApiStudentGrade[],
  studentId: string,
  studentName: string,
): GradebookEntry[] =>
  grades.map((grade) => ({
    studentId,
    studentName,
    courseId: grade.courseId,
    courseCode: grade.courseCode,
    courseTitle: grade.courseTitle,
    activityId: grade.activityId,
    activityTitle: grade.activityTitle,
    pointsEarned: grade.pointsEarned,
    pointsPossible: grade.pointsPossible,
    submitted: grade.submitted,
    comment: grade.comment,
    gradedAt: grade.gradedAt,
    submittedAt: grade.submittedAt,
    submissionText: grade.submissionText,
  }))

export const AppContext = createContext<AppContextValue | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [gradebookEntries, setGradebookEntries] = useState<GradebookEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = useCallback((path: string) => `${apiBaseUrl}${path}`, [])

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      headers.set('Content-Type', 'application/json')
      if (currentUser) {
        headers.set('x-user-id', currentUser.id)
      }

      const response = await fetch(apiUrl(path), {
        ...init,
        headers,
      })

      if (!response.ok) {
        let message = `HTTP ${response.status}`
        try {
          const payload = (await response.json()) as { message?: string }
          message = payload.message ?? message
        } catch {
          // ignore invalid json
        }
        throw new Error(message)
      }

      if (response.status === 204) {
        return undefined as T
      }

      return (await response.json()) as T
    },
    [apiUrl, currentUser],
  )

  const refreshData = useCallback(async () => {
    if (!currentUser) {
      setCourses([])
      setGradebookEntries([])
      setError(null)
      return
    }

    setLoading(true)

    try {
      const courseList = await request<ApiCourseListItem[]>('/courses')
      const courseDetails = await Promise.all(
        courseList.map((course) => request<ApiCourse>(`/courses/${course.id}`)),
      )
      const nextCourses = courseDetails.map(mapCourse)
      const courseLookup = new Map(nextCourses.map((course) => [course.id, course]))

      const nextEntries =
        currentUser.role === 'teacher'
          ? (
              await Promise.all(
                nextCourses.map((course) =>
                  request<ApiTeacherGradebook>(`/courses/${course.id}/gradebook`),
                ),
              )
            ).flatMap((gradebook) => mapTeacherGradebookEntries(gradebook, courseLookup))
          : mapStudentGradebookEntries(
              await request<ApiStudentGrade[]>('/me/grades'),
              currentUser.id,
              currentUser.name,
            )

      setCourses(nextCourses)
      setGradebookEntries(nextEntries)
      setSelectedCourseId((previous) =>
        previous && nextCourses.some((course) => course.id === previous) ? previous : null,
      )
      setSelectedActivityId((previous) =>
        previous &&
        nextCourses.some((course) =>
          course.units.some((unit) =>
            unit.lessons.some((lesson) =>
              lesson.activities.some((activity) => activity.id === previous),
            ),
          ),
        )
          ? previous
          : null,
      )
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [currentUser, request])

  useEffect(() => {
    void refreshData()
  }, [refreshData])

  const createUnit = useCallback(
    async (courseId: string, title: string, description: string) => {
      const response = await request<MutationResponse>(`/courses/${courseId}/units`, {
        method: 'POST',
        body: JSON.stringify({ title, description: description || null }),
      })
      setCourses((previous) =>
        previous.map((course) =>
          course.id === courseId
            ? {
                ...course,
                units: [
                  ...course.units,
                  {
                    id: response.id,
                    title: response.title ?? title,
                    description: response.description ?? (description || null),
                    lessons: [],
                  },
                ],
              }
            : course,
        ),
      )
      void refreshData()
      return response.id
    },
    [refreshData, request],
  )

  const createLesson = useCallback(
    async (unitId: string, title: string, description: string) => {
      const response = await request<MutationResponse>(`/units/${unitId}/lessons`, {
        method: 'POST',
        body: JSON.stringify({ title, description: description || null }),
      })
      setCourses((previous) =>
        previous.map((course) => ({
          ...course,
          units: course.units.map((unit) =>
            unit.id === unitId
              ? {
                  ...unit,
                  lessons: [
                    ...unit.lessons,
                    {
                      id: response.id,
                      title: response.title ?? title,
                      description: response.description ?? (description || null),
                      activities: [],
                    },
                  ],
                }
              : unit,
          ),
        })),
      )
      void refreshData()
      return response.id
    },
    [refreshData, request],
  )

  const createActivity = useCallback(
    async (lessonId: string, input: CreateActivityInput) => {
      const response = await request<ApiActivity>(`/lessons/${lessonId}/activities`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
      let courseId: string | null = null

      setCourses((previous) =>
        previous.map((course) => ({
          ...course,
          units: course.units.map((unit) => ({
            ...unit,
            lessons: unit.lessons.map((lesson) => {
              if (lesson.id !== lessonId) {
                return lesson
              }

              courseId = course.id

              return {
                ...lesson,
                activities: [
                  ...lesson.activities,
                  {
                    id: response.id,
                    title: response.title,
                    type: response.type,
                    description: response.description,
                    directions: response.directions,
                    resourceUrl: response.resourceUrl,
                    visible: response.visible,
                    dueDate: withDateOnly(response.dueAt),
                    points: response.pointsPossible,
                  },
                ],
              }
            }),
          })),
        })),
      )

      if (currentUser?.role === 'teacher' && courseId) {
        setGradebookEntries((previous) => {
          const students = Array.from(
            new Map(
              previous
                .filter((entry) => entry.courseId === courseId)
                .map((entry) => [entry.studentId, entry.studentName]),
            ).entries(),
          )

          return [
            ...previous,
            ...students.map(([studentId, studentName]) => ({
              studentId,
              studentName,
              courseId: courseId!,
              activityId: response.id,
              activityTitle: response.title,
              pointsEarned: null,
              pointsPossible: response.pointsPossible,
              submitted: false,
              comment: null,
              gradedAt: null,
              submittedAt: null,
              submissionText: null,
            })),
          ]
        })
      }

      void refreshData()
      return response.id
    },
    [currentUser, refreshData, request],
  )

  const toggleActivityVisibility = useCallback(
    async (activityId: string, visible: boolean) => {
      await request(`/activities/${activityId}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ visible }),
      })
      setCourses((previous) =>
        updateCoursesForActivity(previous, activityId, (activity) => ({ ...activity, visible })),
      )
      void refreshData()
    },
    [refreshData, request],
  )

  const submitActivity = useCallback(
    async (activityId: string, responseText: string) => {
      await request(`/activities/${activityId}/submissions`, {
        method: 'POST',
        body: JSON.stringify({ content: { responseText } }),
      })
      setGradebookEntries((previous) =>
        previous.map((entry) =>
          entry.activityId === activityId && entry.studentId === currentUser?.id
            ? {
                ...entry,
                submitted: true,
                submittedAt: new Date().toISOString(),
                submissionText: responseText,
              }
            : entry,
        ),
      )
      void refreshData()
    },
    [currentUser?.id, refreshData, request],
  )

  const updateGradebookEntry = useCallback(
    async (studentId: string, activityId: string, points: number, comment: string) => {
      await request('/grades', {
        method: 'PUT',
        body: JSON.stringify({
          studentId,
          activityId,
          pointsEarned: Math.trunc(points),
          comment: comment || null,
        }),
      })
      setGradebookEntries((previous) =>
        previous.map((entry) =>
          entry.studentId === studentId && entry.activityId === activityId
            ? {
                ...entry,
                pointsEarned: Math.trunc(points),
                comment: comment || null,
                gradedAt: new Date().toISOString(),
              }
            : entry,
        ),
      )
      void refreshData()
    },
    [refreshData, request],
  )

  const updateActivityDirections = useCallback(
    async (activityId: string, input: UpdateActivityDirectionsInput) => {
      const response = await request<ApiActivity>(`/activities/${activityId}/directions`, {
        method: 'PATCH',
        body: JSON.stringify({ directions: input.directions ?? null }),
      })
      setCourses((previous) =>
        updateCoursesForActivity(previous, activityId, (activity) => ({
          ...activity,
          directions: response.directions,
        })),
      )
      void refreshData()
    },
    [refreshData, request],
  )

  const value = useMemo(
    () => ({
      users: mockUsers,
      courses,
      gradebookEntries,
      currentUser,
      selectedCourseId,
      selectedActivityId,
      loading,
      error,
      setCurrentUser,
      setSelectedCourseId,
      setSelectedActivityId,
      refreshData,
      createUnit,
      createLesson,
      createActivity,
      toggleActivityVisibility,
      submitActivity,
      updateGradebookEntry,
      updateActivityDirections,
    }),
    [
      courses,
      createActivity,
      createLesson,
      createUnit,
      currentUser,
      error,
      gradebookEntries,
      loading,
      refreshData,
      selectedActivityId,
      selectedCourseId,
      submitActivity,
      toggleActivityVisibility,
      updateActivityDirections,
      updateGradebookEntry,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
