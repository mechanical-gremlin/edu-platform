import type { ReactNode } from 'react'
import type { NavKey, NavItem } from '../../hooks/useRoleNavigation'
import type { User } from '../../types/models'
import { SidebarNav } from '../navigation/SidebarNav'
import { TopNav } from '../navigation/TopNav'

interface DashboardLayoutProps {
  user: User
  navItems: NavItem[]
  selectedNav: NavKey
  onNavSelect: (key: NavKey) => void
  onLogout: () => void
  children: ReactNode
}

export const DashboardLayout = ({
  user,
  navItems,
  selectedNav,
  onNavSelect,
  onLogout,
  children,
}: DashboardLayoutProps) => (
  <div className="min-h-screen bg-slate-100">
    <TopNav user={user} onLogout={onLogout} />
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      <SidebarNav items={navItems} selected={selectedNav} onSelect={onNavSelect} />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  </div>
)
