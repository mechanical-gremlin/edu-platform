import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
  const menuId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
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
      const target = event.target as Node
      if (
        containerRef.current
        && !containerRef.current.contains(target)
        && !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }

    updatePosition()
    requestAnimationFrame(() => itemRefs.current[0]?.focus())
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  const focusItem = (index: number) => {
    const count = itemRefs.current.length
    if (count === 0) {
      return
    }
    const normalizedIndex = (index + count) % count
    itemRefs.current[normalizedIndex]?.focus()
  }

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
        onKeyDown={(event) => {
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && visibleItems.length > 0) {
            event.preventDefault()
            setOpen(true)
            requestAnimationFrame(() => focusItem(event.key === 'ArrowUp' ? visibleItems.length - 1 : 0))
          }
        }}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        ⋮
      </button>
      {open && visibleItems.length > 0 && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              style={{ top: menuPosition.top, right: menuPosition.right }}
              id={menuId}
              role="menu"
              aria-label={ariaLabel}
              onKeyDown={(event) => {
                const currentIndex = itemRefs.current.findIndex((item) => item === document.activeElement)
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setOpen(false)
                  buttonRef.current?.focus()
                } else if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  focusItem(currentIndex + 1)
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  focusItem(currentIndex - 1)
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  focusItem(0)
                } else if (event.key === 'End') {
                  event.preventDefault()
                  focusItem(itemRefs.current.length - 1)
                }
              }}
            >
              {visibleItems.map((item, index) => (
                <button
                  key={`${item.label}-${index}`}
                  ref={(element) => {
                    itemRefs.current[index] = element
                  }}
                  type="button"
                  role="menuitem"
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
