import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityFullScreen } from './components/activity/ActivityFullScreen'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { useAppContext } from './context/useAppContext'
import { getRoleNavigation, type NavKey } from './hooks/useRoleNavigation'
import { AdminPage } from './pages/AdminPage'
import { CoursePage } from './pages/CoursePage'
import { CoursesPage } from './pages/CoursesPage'
import { DashboardPage } from './pages/DashboardPage'
import { GradebookPage } from './pages/GradebookPage'
import { LoginPage } from './pages/LoginPage'
import type { User } from './types/models'

const STORAGE_KEYS = {
  selectedNav: 'edu-platform.selected-nav',
  apiDebugVisible: 'edu-platform.api-debug-visible',
} as const

const readStoredValue = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback
  }

  const storedValue = window.localStorage.getItem(key)
  if (!storedValue) {
    return fallback
  }

  try {
    return JSON.parse(storedValue) as T
  } catch {
    return fallback
  }
}

function App() {
  const {
    users,
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
    addEnrollment,
    createActivity,
    createCourse,
    createLesson,
    createUnit,
    submitActivity,
    toggleActivityVisibility,
    updateActivityDirections,
    updateGradebookEntry,
  } = useAppContext()

  const [selectedNav, setSelectedNav] = useState<NavKey>(() =>
    readStoredValue<NavKey>(STORAGE_KEYS.selectedNav, 'dashboard'),
  )
  const [healthStatus, setHealthStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [healthMessage, setHealthMessage] = useState('Not checked')
  const [meStatus, setMeStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [meMessage, setMeMessage] = useState('Login to test /me')
  const [apiDebugVisible, setApiDebugVisible] = useState<boolean>(() =>
    readStoredValue<boolean>(STORAGE_KEYS.apiDebugVisible, true),
  )

  const apiBaseUrl = useMemo(() => {
    const rawValue = import.meta.env.VITE_API_BASE_URL?.trim()
    return rawValue ? rawValue.replace(/\/+$/, '') : ''
  }, [])

  const apiUrl = useCallback((path: string) => `${apiBaseUrl}${path}`, [apiBaseUrl])

  useEffect(() => {
    let cancelled = false

    const checkHealth = async () => {
      setHealthStatus('loading')
      setHealthMessage('Checking /health...')

      try {
        const response = await fetch(apiUrl('/health'))
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const payload = (await response.json()) as { status?: string }
        if (!cancelled) {
          if (payload.status === 'ok') {
            setHealthStatus('ok')
            setHealthMessage('Connected to backend /health')
          } else {
            setHealthStatus('error')
            setHealthMessage('Unexpected /health response')
          }
        }
      } catch (checkError) {
        if (!cancelled) {
          setHealthStatus('error')
          setHealthMessage(checkError instanceof Error ? checkError.message : 'Connection failed')
        }
      }
    }

    void checkHealth()

    return () => {
      cancelled = true
    }
  }, [apiUrl])

  useEffect(() => {
    let cancelled = false

    if (!currentUser) {
      setMeStatus('idle')
      setMeMessage('Login to test /me')
      return () => {
        cancelled = true
      }
    }

    const checkCurrentUser = async () => {
      setMeStatus('loading')
      setMeMessage(`Checking /me as ${currentUser.id}...`)

      try {
        const response = await fetch(apiUrl('/me'), {
          headers: { 'x-user-id': currentUser.id },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const payload = (await response.json()) as { id?: string; role?: string }
        if (!cancelled) {
          setMeStatus('ok')
          setMeMessage(`API user: ${payload.id ?? 'unknown'} (${payload.role ?? 'unknown'})`)
        }
      } catch (checkError) {
        if (!cancelled) {
          setMeStatus('error')
          setMeMessage(checkError instanceof Error ? checkError.message : 'Connection failed')
        }
      }
    }

    void checkCurrentUser()

    return () => {
      cancelled = true
    }
  }, [apiUrl, currentUser])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEYS.selectedNav, JSON.stringify(selectedNav))
  }, [selectedNav])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEYS.apiDebugVisible, JSON.stringify(apiDebugVisible))
  }, [apiDebugVisible])

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  )

  const allActivities = useMemo(
    () =>
      courses
        .flatMap((course) => course.units)
        .flatMap((unit) => unit.lessons)
        .flatMap((lesson) => lesson.activities),
    [courses],
  )

  const selectedActivity = useMemo(
    () => allActivities.find((activity) => activity.id === selectedActivityId) ?? null,
    [allActivities, selectedActivityId],
  )

  const statusColor = (status: 'idle' | 'loading' | 'ok' | 'error') => {
    if (status === 'ok') return 'text-emerald-700'
    if (status === 'error') return 'text-rose-700'
    if (status === 'loading') return 'text-amber-700'
    return 'text-slate-600'
  }

  const apiDebugPanel = (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {!apiDebugVisible && (
        <button
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg hover:bg-slate-50"
          onClick={() => setApiDebugVisible(true)}
        >
          Show API Debug
        </button>
      )}
      {apiDebugVisible && (
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-900">API Debug</p>
            <button
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
              onClick={() => setApiDebugVisible(false)}
            >
              Hide
            </button>
          </div>
          <p className="mt-1 text-slate-500">Base URL: {apiBaseUrl || '(same origin)'}</p>
          <p className={`mt-2 ${statusColor(healthStatus)}`}>/health: {healthMessage}</p>
          <p className={`mt-1 ${statusColor(meStatus)}`}>/me: {meMessage}</p>
        </div>
      )}
    </div>
  )

  if (!currentUser) {
    return (
      <>
        <LoginPage users={users} onLogin={setCurrentUser} />
        {apiDebugPanel}
      </>
    )
  }

  const navItems = getRoleNavigation(currentUser.role)

  const handleNavSelect = (nav: NavKey) => {
    setSelectedNav(nav)
    setSelectedActivityId(null)

    if (nav === 'courses') {
      setSelectedCourseId(null)
    }
  }

  const openCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
    setSelectedNav('courses')
    setSelectedActivityId(null)
  }

  const fetchUsers = async (): Promise<User[]> => {
    const response = await fetch(apiUrl('/users'), {
      headers: { 'x-user-id': currentUser.id, 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as User[]
  }

  return (
    <>
      <DashboardLayout
        user={currentUser}
        navItems={navItems}
        selectedNav={selectedNav}
        onNavSelect={handleNavSelect}
        onLogout={() => {
          setSelectedNav('dashboard')
          setCurrentUser(null)
        }}
      >
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {loading && courses.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Loading course data…
          </div>
        )}

        {selectedNav === 'dashboard' && (
          <DashboardPage
            user={currentUser}
            courses={courses}
            gradebookEntries={gradebookEntries}
            onCourseOpen={openCourse}
          />
        )}

        {selectedNav === 'courses' && selectedCourse && (
          <CoursePage
            user={currentUser}
            course={selectedCourse}
            gradebookEntries={gradebookEntries}
            onActivitySelect={setSelectedActivityId}
            onCreateUnit={createUnit}
            onCreateLesson={createLesson}
            onCreateActivity={createActivity}
            onToggleActivityVisibility={toggleActivityVisibility}
            onBack={() => setSelectedCourseId(null)}
            onAddEnrollment={
              currentUser.role === 'teacher'
                ? (courseId, userId, role) => addEnrollment(courseId, { userId, role })
                : undefined
            }
            fetchUsers={currentUser.role === 'teacher' ? fetchUsers : undefined}
          />
        )}

        {selectedNav === 'courses' && !selectedCourse && (
          <CoursesPage
            user={currentUser}
            courses={courses}
            gradebookEntries={gradebookEntries}
            onCourseOpen={openCourse}
            onCreateCourse={
              currentUser.role === 'teacher'
                ? async (title, code, description) => {
                    const id = await createCourse({ title, code, description: description || null })
                    setSelectedCourseId(id)
                    setSelectedNav('courses')
                  }
                : undefined
            }
          />
        )}

        {selectedNav === 'gradebook' && (
          <GradebookPage
            entries={gradebookEntries}
            courses={courses}
            user={currentUser}
            onSaveGrade={updateGradebookEntry}
          />
        )}

        {selectedNav === 'admin' && (
          <AdminPage currentUser={currentUser} />
        )}
      </DashboardLayout>

      {selectedActivity && (
        <ActivityFullScreen
          activity={selectedActivity}
          allActivities={allActivities}
          currentUser={currentUser}
          gradebookEntries={gradebookEntries}
          onClose={() => setSelectedActivityId(null)}
          onNavigate={setSelectedActivityId}
          onSaveGrade={updateGradebookEntry}
          onSubmitActivity={submitActivity}
          onUpdateActivityDirections={updateActivityDirections}
        />
      )}
      {apiDebugPanel}
    </>
  )
}

export default App
