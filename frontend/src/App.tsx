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
    updateGradebookEntry,
  } = useAppContext()

  const [selectedNav, setSelectedNav] = useState<NavKey>('dashboard')
  const [modalOpen, setModalOpen] = useState(false)

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  )

  const allActivities = useMemo(
    () =>
      courses
        .flatMap((c) => c.units)
        .flatMap((u) => u.lessons)
        .flatMap((l) => l.activities),
    [courses],
  )

  const selectedActivity = useMemo(
    () => allActivities.find((a) => a.id === selectedActivityId) ?? null,
    [allActivities, selectedActivityId],
  )

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
          <DashboardPage user={currentUser} courses={courses} gradebookEntries={gradebookEntries} onCourseOpen={openCourse} />
        )}

        {selectedNav === 'courses' && selectedCourse && (
          <CoursePage
            user={currentUser}
            course={selectedCourse}
            gradebookEntries={gradebookEntries}
            onActivitySelect={setSelectedActivityId}
            modalOpen={modalOpen}
            onModalOpen={() => setModalOpen(true)}
            onModalClose={() => setModalOpen(false)}
          />
        )}

        {selectedNav === 'courses' && !selectedCourse && (
          <CoursesPage user={currentUser} courses={courses} onCourseOpen={openCourse} />
        )}

        {selectedNav === 'gradebook' && (
          <GradebookPage
            entries={gradebookEntries}
            user={currentUser}
            onSaveGrade={updateGradebookEntry}
          />
        )}
      </DashboardLayout>

      {/* Full-screen activity overlay */}
      {selectedActivity && (
        <ActivityFullScreen
          activity={selectedActivity}
          allActivities={allActivities}
          currentUser={currentUser}
          gradebookEntries={gradebookEntries}
          onClose={() => setSelectedActivityId(null)}
          onNavigate={setSelectedActivityId}
        />
      )}
    </>
  )
}

export default App

