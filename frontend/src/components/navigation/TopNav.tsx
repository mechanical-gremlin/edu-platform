import type { User } from '../../types/models'

interface TopNavProps {
  user: User
  onLogout: () => void
}

export const TopNav = ({ user, onLogout }: TopNavProps) => (
  <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Edu Platform</p>
        <p className="hidden text-sm text-slate-600 sm:block">Curated CS learning paths</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Settings
        </button>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1">
          <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full" />
          <span className="max-w-[10rem] truncate pr-2 text-sm font-medium text-slate-700">{user.name}</span>
        </div>
        <button
          onClick={onLogout}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          aria-label="Sign out"
        >
          Sign Out
        </button>
      </div>
    </div>
  </header>
)
