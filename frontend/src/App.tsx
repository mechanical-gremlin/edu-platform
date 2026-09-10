import { useMemo, useState } from 'react'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { useAppContext } from './context/useAppContext'
import { getRoleNavigation, type NavKey } from './hooks/useRoleNavigation'
import { CoursePage } from './pages/CoursePage'
import { CoursesPage } from './pages/CoursesPage'
import { DashboardPage } from './pages/DashboardPage'
import { GradebookPage } from './pages/GradebookPage'
import { LoginPage } from './pages/LoginPage'
import { ActivityFullScreen } from './components/activity/ActivityFullScreen'

function App() {
  const {
    users,
    courses,
    gradebookEntries,
    currentUser,
    selectedCourseId,
    selectedActivityId,
    setCurrentUser,
    setSelectedCourseId,
    setSelectedActivityId,
  } = useAppContext()

  const [selectedNav, setSelectedNav] = useState<NavKey>('dashboard')
  const [modalOpen, setModalOpen] = useState(false)

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  )

  const selectedActivity = useMemo(() => {
    if (!selectedActivityId) return null
    return courses
      .flatMap((c) => c.units)
      .flatMap((u) => u.lessons)
      .flatMap((l) => l.activities)
      .find((a) => a.id === selectedActivityId) ?? null
  }, [courses, selectedActivityId])

  if (!currentUser) {
    return <LoginPage users={users} onLogin={setCurrentUser} />
  }

  const navItems = getRoleNavigation(currentUser.role)

  const openCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
    setSelectedNav('courses')
    setSelectedActivityId(null)
  }

  return (
    <>
      <DashboardLayout user={currentUser} navItems={navItems} selectedNav={selectedNav} onNavSelect={setSelectedNav}>
        {selectedNav === 'dashboard' && (
          <DashboardPage user={currentUser} courses={courses} onCourseOpen={openCourse} />
        )}

        {selectedNav === 'courses' && selectedCourse && (
          <CoursePage
            user={currentUser}
            course={selectedCourse}
            selectedActivityId={selectedActivityId}
            onActivitySelect={setSelectedActivityId}
            modalOpen={modalOpen}
            onModalOpen={() => setModalOpen(true)}
            onModalClose={() => setModalOpen(false)}
          />
        )}

        {selectedNav === 'courses' && !selectedCourse && (
          <CoursesPage user={currentUser} courses={courses} onCourseOpen={openCourse} />
        )}

        {selectedNav === 'gradebook' && currentUser.role === 'teacher' && (
          <GradebookPage entries={gradebookEntries} />
        )}
      </DashboardLayout>

      {/* Full-screen activity overlay */}
      {selectedActivity && (
        <ActivityFullScreen
          activity={selectedActivity}
          onClose={() => setSelectedActivityId(null)}
        />
      )}
    </>
  )
}

export default App

