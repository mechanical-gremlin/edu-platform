import type { UserRole } from '../types/models'

export type NavKey = 'dashboard' | 'courses' | 'gradebook' | 'admin'

export interface NavItem {
  key: NavKey
  label: string
}

export const getRoleNavigation = (role: UserRole): NavItem[] => {
  const shared: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'courses', label: 'Courses' },
  ]

  if (role === 'teacher') {
    return [...shared, { key: 'gradebook', label: 'Gradebook' }]
  }

  if (role === 'school_admin' || role === 'system_admin') {
    return [{ key: 'admin', label: 'Admin Portal' }, ...shared, { key: 'gradebook', label: 'Gradebook' }]
  }

  return [...shared, { key: 'gradebook', label: 'My Grades' }]
}
