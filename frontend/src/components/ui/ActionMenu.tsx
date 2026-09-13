import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface ActionMenuItem {
  label: string
  onClick: () => void | Promise<void>
  disabled?: boolean
  danger?: boolean
}

interface ActionMenuProps {
  ariaLabel: string
  items: ActionMenuItem[]
}

export const ActionMenu = ({ ariaLabel, items }: ActionMenuProps) => {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const visibleItems = useMemo(() => items.filter((item) => !item.disabled), [items])

  useEffect(() => {
    if (!open) {
      return
    }

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      setMenuPosition({
        top: rect.bottom + 4,
        right: Math.max(window.innerWidth - rect.right, 16),
      })
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    updatePosition()
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        aria-label={ariaLabel}
      >
        ⋮
      </button>
      {open && visibleItems.length > 0 && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              style={{ top: menuPosition.top, right: menuPosition.right }}
            >
              {visibleItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                    item.danger ? 'text-rose-600' : 'text-slate-700'
                  }`}
                  onClick={() => {
                    setOpen(false)
                    item.onClick()
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
