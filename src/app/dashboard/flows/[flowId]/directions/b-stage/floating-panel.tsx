'use client'

import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => !el.hasAttribute('disabled'))
    .filter((el) => el.offsetParent !== null || el === document.activeElement)
}

export function FloatingPanel({
  open,
  titleId,
  label,
  onClose,
  initialFocusRef,
  style,
  children,
}: {
  open: boolean
  titleId?: string
  label?: string
  onClose: () => void
  initialFocusRef?: RefObject<HTMLElement | null>
  style: CSSProperties
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const target = initialFocusRef?.current ?? getFocusable(panel)[0] ?? panel
      target.focus()
    }, 0)

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [initialFocusRef, open])

  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const panel = panelRef.current
    if (!panel) return
    const focusable = getFocusable(panel)
    if (focusable.length === 0) {
      event.preventDefault()
      panel.focus()
      return
    }

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const current = document.activeElement

    if (event.shiftKey && current === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      ref={panelRef}
      role={open ? 'dialog' : undefined}
      aria-modal={open ? false : undefined}
      aria-labelledby={open ? titleId : undefined}
      aria-label={open && !titleId ? label : undefined}
      tabIndex={-1}
      onKeyDownCapture={onKeyDownCapture}
      style={style}
    >
      {children}
    </div>
  )
}
