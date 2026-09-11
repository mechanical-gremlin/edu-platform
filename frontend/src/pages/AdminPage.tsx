/**
 * AdminPage — scaffold for school_admin and system_admin roles.
 *
 * Current state: structural placeholder with role-gated sections.
 * Features are intentionally stubbed for future development.
 *
 * Planned features:
 *   school_admin — manage teachers, view shared courses, view school-wide analytics
 *   system_admin — manage all users, manage all schools, platform configuration
 */

import type { User } from '../types/models'

interface AdminPageProps {
  currentUser: User
}

const SCHOOL_ADMIN_SECTIONS = [
  {
    title: 'Teachers',
    description: 'View and manage teacher accounts for your school. Approve new teachers and deactivate accounts.',
    icon: '👩‍🏫',
    status: 'coming soon',
  },
  {
    title: 'Shared Course Library',
    description: 'Browse courses shared by teachers in your school. Approve courses for publication to the shared library.',
    icon: '📚',
    status: 'coming soon',
  },
  {
    title: 'School Analytics',
    description: 'View aggregate completion rates, late submission trends, and activity engagement across all courses.',
    icon: '📊',
    status: 'coming soon',
  },
  {
    title: 'Student Roster',
    description: 'View all students enrolled in your school and their course assignments.',
    icon: '🧑‍🎓',
    status: 'coming soon',
  },
]

const SYSTEM_ADMIN_SECTIONS = [
  {
    title: 'All Users',
    description: 'Create, search, and manage all teacher, student, school_admin, and system_admin accounts.',
    icon: '👥',
    status: 'coming soon',
  },
  {
    title: 'Schools',
    description: 'Create and manage school entities. Assign school admins and configure per-school settings.',
    icon: '🏫',
    status: 'coming soon',
  },
  {
    title: 'Platform Analytics',
    description: 'System-wide usage metrics: active users, code executions, submission volume, and API health.',
    icon: '🖥️',
    status: 'coming soon',
  },
  {
    title: 'Shared Course Catalogue',
    description: 'Manage the global shared course library visible across all schools. Approve, feature, or archive courses.',
    icon: '🌐',
    status: 'coming soon',
  },
  {
    title: 'Configuration',
    description: 'Platform-level settings: Judge0 API configuration, feature flags, and maintenance mode.',
    icon: '⚙️',
    status: 'coming soon',
  },
]

export const AdminPage = ({ currentUser }: AdminPageProps) => {
  const isSystemAdmin = currentUser.role === 'system_admin'
  const isSchoolAdmin = currentUser.role === 'school_admin'

  if (!isSystemAdmin && !isSchoolAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="text-center">
          <p className="text-4xl">🔒</p>
          <p className="mt-4 text-base font-medium text-slate-700">Admin access required</p>
          <p className="mt-1 text-sm text-slate-500">
            This area is restricted to school and system administrators.
          </p>
        </div>
      </div>
    )
  }

  const sections = isSystemAdmin
    ? [...SCHOOL_ADMIN_SECTIONS, ...SYSTEM_ADMIN_SECTIONS]
    : SCHOOL_ADMIN_SECTIONS

  const roleLabel = isSystemAdmin ? 'System Administrator' : 'School Administrator'

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Logged in as <strong>{currentUser.name}</strong> · {roleLabel}
        </p>
      </header>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-sm font-medium text-amber-800">🚧 Under Construction</p>
        <p className="mt-1 text-sm text-amber-700">
          The admin portal is scaffolded and role-gated. All sections below are planned for future
          development. The data model and role infrastructure are in place — features will be built
          here incrementally.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.title}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-2xl">{section.icon}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {section.status}
              </span>
            </div>
            <h2 className="text-base font-semibold text-slate-800">{section.title}</h2>
            <p className="text-sm text-slate-500">{section.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
