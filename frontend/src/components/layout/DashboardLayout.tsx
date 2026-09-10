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
  children: ReactNode
}

export const DashboardLayout = ({
  user,
  navItems,
  selectedNav,
  onNavSelect,
  children,
}: DashboardLayoutProps) => (
  <div className="min-h-screen bg-slate-100">
    <TopNav user={user} />
    <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
      <SidebarNav items={navItems} selected={selectedNav} onSelect={onNavSelect} />
      <main className="w-full p-4 md:p-6">{children}</main>
    </div>
  </div>
)
