'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  BookOpen,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Mail,
} from 'lucide-react'
import { B } from './palette'

const HELP_LINKS = [
  {
    label: 'Email support',
    detail: 'support@instasetter.com',
    href: 'mailto:support@instasetter.com',
    icon: Mail,
  },
  {
    label: 'Status page',
    detail: 'status.instasetter.com',
    href: 'https://status.instasetter.com',
    icon: Activity,
  },
  {
    label: 'Docs',
    detail: 'docs.instasetter.com',
    href: 'https://docs.instasetter.com',
    icon: BookOpen,
  },
]

export function HeaderHelpMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="flow-builder-help-menu"
        onClick={() => setOpen((current) => !current)}
        style={{
          padding: '10px 12px',
          borderRadius: 12,
          border: `1px solid ${open ? B.accentSoft : B.line}`,
          background: open ? B.accentSoft : B.lineSoft,
          color: open ? B.accentInk : B.ink,
          fontSize: 12.5,
          cursor: 'pointer',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'inherit',
        }}
      >
        <HelpCircle size={15} strokeWidth={1.9} aria-hidden />
        Help
        <ChevronDown size={13} strokeWidth={1.9} aria-hidden />
      </button>
      {open && (
        <div
          id="flow-builder-help-menu"
          role="menu"
          aria-label="Flow builder help"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 236,
            padding: 6,
            borderRadius: 12,
            border: `1px solid ${B.line}`,
            background: B.panel,
            boxShadow: '0 18px 38px rgba(22,21,40,0.14)',
            zIndex: 40,
          }}
        >
          {HELP_LINKS.map(({ label, detail, href, icon: Icon }) => (
            <a
              key={href}
              role="menuitem"
              href={href}
              target={href.startsWith('mailto:') ? undefined : '_blank'}
              rel={href.startsWith('mailto:') ? undefined : 'noreferrer'}
              onClick={() => setOpen(false)}
              style={{
                display: 'grid',
                gridTemplateColumns: '18px 1fr 14px',
                alignItems: 'center',
                gap: 9,
                padding: '9px 10px',
                borderRadius: 8,
                color: B.ink,
                textDecoration: 'none',
              }}
            >
              <Icon size={14} color={B.ink3} aria-hidden />
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 650,
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    display: 'block',
                    color: B.ink3,
                    fontSize: 11,
                    lineHeight: 1.25,
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {detail}
                </span>
              </span>
              <ExternalLink size={12} color={B.ink3} aria-hidden />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
