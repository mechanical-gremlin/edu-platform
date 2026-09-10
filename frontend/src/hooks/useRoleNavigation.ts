import type { UserRole } from '../types/models'

export type NavKey = 'dashboard' | 'course' | 'gradebook'

export interface NavItem {
  key: NavKey
  label: string
}

export const getRoleNavigation = (role: UserRole): NavItem[] => {
  const shared: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'course', label: 'Courses' },
  ]

  if (role === 'teacher') {
    return [...shared, { key: 'gradebook', label: 'Gradebook' }]
  }

  return shared
}
