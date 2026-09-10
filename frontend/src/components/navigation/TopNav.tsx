import type { User } from '../../types/models'

interface TopNavProps {
  user: User
}

export const TopNav = ({ user }: TopNavProps) => (
  <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Edu Platform</p>
      <p className="text-sm text-slate-600">Curated CS learning paths</p>
    </div>
    <div className="flex items-center gap-3">
      <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
        Settings
      </button>
      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1">
        <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full" />
        <span className="pr-2 text-sm font-medium text-slate-700">{user.name}</span>
      </div>
    </div>
  </header>
)
