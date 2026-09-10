import type { NavItem, NavKey } from '../../hooks/useRoleNavigation'

interface SidebarNavProps {
  items: NavItem[]
  selected: NavKey
  onSelect: (key: NavKey) => void
}

export const SidebarNav = ({ items, selected, onSelect }: SidebarNavProps) => (
  <aside className="w-full border-b border-slate-200 bg-white md:w-64 md:border-b-0 md:border-r">
    <nav className="flex gap-2 overflow-x-auto p-3 md:flex-col md:p-4">
      {items.map((item) => (
        <button
          key={item.key}
          className={`rounded-xl px-4 py-2 text-left text-sm font-medium transition ${
            selected === item.key
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          onClick={() => onSelect(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  </aside>
)
