import { useMemo, useState } from 'react'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { useAppContext } from './context/useAppContext'
import { getRoleNavigation, type NavKey } from './hooks/useRoleNavigation'
import { CoursePage } from './pages/CoursePage'
import { DashboardPage } from './pages/DashboardPage'
import { GradebookPage } from './pages/GradebookPage'
import { LoginPage } from './pages/LoginPage'

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

  if (!currentUser) {
    return <LoginPage users={users} onLogin={setCurrentUser} />
  }

  const navItems = getRoleNavigation(currentUser.role)

  const openCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
    setSelectedNav('course')
    setSelectedActivityId(null)
  }

  return (
    <DashboardLayout user={currentUser} navItems={navItems} selectedNav={selectedNav} onNavSelect={setSelectedNav}>
      {selectedNav === 'dashboard' && (
        <DashboardPage user={currentUser} courses={courses} onCourseOpen={openCourse} />
      )}

      {selectedNav === 'course' && selectedCourse && (
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

      {selectedNav === 'course' && !selectedCourse && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Choose a course from the dashboard first.
        </div>
      )}

      {selectedNav === 'gradebook' && currentUser.role === 'teacher' && (
        <GradebookPage entries={gradebookEntries} />
      )}
    </DashboardLayout>
  )
}

export default App
