'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'

type ToastTone = 'neutral' | 'success' | 'danger'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const toast = useCallback((message: string, tone: ToastTone = 'neutral') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3200)
  }, [])

  const success = useCallback(
    (message: string) => toast(message, 'success'),
    [toast]
  )
  const error = useCallback(
    (message: string) => toast(message, 'danger'),
    [toast]
  )

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return ctx
}

const toneStyles: Record<ToastTone, { bg: string; fg: string }> = {
  neutral: { bg: '#161528', fg: '#FAFAFB' },
  success: { bg: '#1F6B3A', fg: '#FAFAFB' },
  danger: { bg: '#8E2A2A', fg: '#FAFAFB' },
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        zIndex: 500,
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const [enter, setEnter] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEnter(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  const tone = toneStyles[toast.tone]
  return (
    <div
      role="status"
      style={{
        padding: '10px 16px',
        borderRadius: 10,
        background: tone.bg,
        color: tone.fg,
        fontSize: 12.5,
        fontWeight: 500,
        boxShadow: '0 10px 28px rgba(22,21,40,0.22)',
        pointerEvents: 'auto',
        opacity: enter ? 1 : 0,
        transform: enter ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 160ms, transform 160ms',
      }}
    >
      {toast.message}
    </div>
  )
}
