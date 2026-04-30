'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import { getBlockDisplayLabel } from '@/lib/dashboard/flow-builder-labels'
import { blockColor, SERIF_FAMILY } from '../../shared-data'
import {
  PROMPT_READER_STATUS,
  StatusBadge,
  StatusNote,
  getLiveRuntimeStatus,
} from '../../surface-status'
import type { FlowNode } from '../../types'
import {
  countLines,
  getBlockPromptPlan,
  type PromptSection,
} from './block-sections'
import { B } from './palette'
import { RenderPrompt } from './prompt-render'

function useEscape(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [onClose, active])
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function CopyButton({
  text,
  label = 'Copy',
}: {
  text: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(text)
        if (ok) {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1400)
        }
      }}
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: copied ? '#1F6B3A' : B.ink3,
        background: copied ? '#DFF3E4' : 'transparent',
        border: `1px solid ${copied ? '#BCE4C4' : B.line}`,
        padding: '4px 10px',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

function Rationale({ section }: { section: PromptSection }) {
  if (!section.rationale) return null
  const { stat, insights } = section.rationale
  return (
    <aside
      style={{
        marginBottom: 20,
        padding: '14px 16px',
        background: B.accentSoft,
        borderRadius: 10,
        borderLeft: `3px solid ${B.accent}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: B.accentInk,
          marginBottom: stat ? 4 : 8,
        }}
      >
        Why this exists
      </div>
      {stat && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: B.accentInk,
            marginBottom: 8,
            fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
          }}
        >
          {stat}
        </div>
      )}
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        {insights.map((it, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              fontSize: 12.5,
              color: B.accentInk,
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                marginTop: 1,
                opacity: 0.7,
              }}
            >
              ·
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function SectionCard({
  section,
  mode,
}: {
  section: PromptSection
  mode: 'primary' | 'global'
}) {
  const lines = countLines(section.text)
  return (
    <section
      id={`sec-${section.id}`}
      style={{
        scrollMarginTop: 24,
        background: B.panel,
        border: `1px solid ${B.line}`,
        borderRadius: 12,
        padding: 28,
        marginBottom: 18,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
          paddingBottom: 14,
          borderBottom: `1px solid ${B.lineSoft}`,
        }}
      >
        {mode === 'primary' && (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: B.accentInk,
              background: B.accentSoft,
              padding: '3px 7px',
              borderRadius: 5,
            }}
          >
            Block
          </span>
        )}
        {mode === 'global' && (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: B.ink3,
              background: B.lineSoft,
              padding: '3px 7px',
              borderRadius: 5,
            }}
          >
            Global
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: SERIF_FAMILY,
              fontSize: 20,
              color: B.ink,
              lineHeight: 1.2,
            }}
          >
            {section.title}
          </div>
          {section.primaryFor && (
            <div
              style={{
                fontSize: 12,
                color: B.ink3,
                marginTop: 2,
              }}
            >
              {section.primaryFor}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: B.ink3 }}>{lines} lines</div>
        <CopyButton text={section.text} />
      </header>
      <Rationale section={section} />
      <RenderPrompt text={section.text} />
      <div
        style={{
          marginTop: 20,
          paddingTop: 14,
          borderTop: `1px dashed ${B.line}`,
          fontSize: 11,
          color: B.ink3,
          fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
        }}
      >
        {section.source}
      </div>
    </section>
  )
}

function Toc({
  items,
  activeId,
  onJump,
}: {
  items: Array<{ section: PromptSection; mode: 'primary' | 'global' }>
  activeId: string | null
  onJump: (id: string) => void
}) {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        width: 220,
        flexShrink: 0,
        padding: '24px 14px 24px 24px',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.9,
          textTransform: 'uppercase',
          color: B.ink3,
          marginBottom: 10,
        }}
      >
        This block
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items
          .filter((i) => i.mode === 'primary')
          .map(({ section }) => (
            <TocLink
              key={section.id}
              section={section}
              active={activeId === section.id}
              onJump={onJump}
              mode="primary"
            />
          ))}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.9,
          textTransform: 'uppercase',
          color: B.ink3,
          marginTop: 22,
          marginBottom: 10,
        }}
      >
        Always applies
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items
          .filter((i) => i.mode === 'global')
          .map(({ section }) => (
            <TocLink
              key={section.id}
              section={section}
              active={activeId === section.id}
              onJump={onJump}
              mode="global"
            />
          ))}
      </div>
    </nav>
  )
}

function TocLink({
  section,
  active,
  onJump,
  mode,
}: {
  section: PromptSection
  active: boolean
  onJump: (id: string) => void
  mode: 'primary' | 'global'
}) {
  return (
    <button
      type="button"
      onClick={() => onJump(section.id)}
      style={{
        textAlign: 'left',
        fontSize: 13,
        padding: '7px 10px',
        background: active ? B.accentSoft : 'transparent',
        color: active ? B.accentInk : mode === 'global' ? B.ink3 : B.ink2,
        border: 'none',
        borderRadius: 7,
        cursor: 'pointer',
        fontWeight: active ? 500 : 400,
        transition: 'background 0.15s',
      }}
    >
      {section.title}
    </button>
  )
}

export function PromptReader({
  block,
  brand,
  onClose,
  initialTarget,
}: {
  block: FlowNode
  brand: string
  onClose: () => void
  initialTarget?: string
}) {
  useEscape(onClose, true)
  const plan = useMemo(
    () => getBlockPromptPlan(brand, block.type),
    [brand, block.type]
  )
  const allItems = useMemo(
    () => [
      ...plan.primary.map((section) => ({
        section,
        mode: 'primary' as const,
      })),
      ...plan.global.map((section) => ({ section, mode: 'global' as const })),
    ],
    [plan]
  )
  const [activeId, setActiveId] = useState<string | null>(
    initialTarget ?? allItems[0]?.section.id ?? null
  )

  useEffect(() => {
    if (!initialTarget) return
    let cancelled = false
    const attempt = (tries: number) => {
      if (cancelled) return
      const el = document.getElementById(`sec-${initialTarget}`)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        return
      }
      if (tries < 30) {
        window.setTimeout(() => attempt(tries + 1), 30)
      }
    }
    attempt(0)
    return () => {
      cancelled = true
    }
  }, [initialTarget])
  const combinedText = useMemo(
    () => allItems.map(({ section }) => `${section.text}`).join('\n\n'),
    [allItems]
  )

  useEffect(() => {
    const root = document.getElementById('prompt-reader-scroll')
    if (!root) return
    const handler = () => {
      let current = allItems[0]?.section.id ?? null
      for (const { section } of allItems) {
        const el = document.getElementById(`sec-${section.id}`)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        const rootRect = root.getBoundingClientRect()
        if (rect.top - rootRect.top < 120) current = section.id
      }
      setActiveId(current)
    }
    root.addEventListener('scroll', handler, { passive: true })
    return () => root.removeEventListener('scroll', handler)
  }, [allItems])

  const jump = (id: string) => {
    const el = document.getElementById(`sec-${id}`)
    const root = document.getElementById('prompt-reader-scroll')
    if (!el || !root) return
    const top = el.offsetTop - 20
    root.scrollTo({ top, behavior: 'smooth' })
    setActiveId(id)
  }

  const color = blockColor(block.type, { l: 0.58, c: 0.14 })
  const label = getBlockDisplayLabel(block.type)
  const runtimeStatus = getLiveRuntimeStatus()

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(22,21,40,0.52)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        zIndex: 300,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1040px, 100%)',
          height: 'min(88vh, 900px)',
          background: B.bg,
          borderRadius: 16,
          boxShadow: '0 28px 80px rgba(22,21,40,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            padding: '18px 24px',
            background: B.panel,
            borderBottom: `1px solid ${B.line}`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexShrink: 0,
          }}
        >
          <div
            style={{ width: 6, height: 36, borderRadius: 3, background: color }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: B.ink3,
              }}
            >
              {label} · System Prompt
            </div>
            <div
              style={{
                fontFamily: SERIF_FAMILY,
                fontSize: 22,
                color: B.ink,
                lineHeight: 1.2,
                marginTop: 2,
              }}
            >
              {block.name}
            </div>
          </div>
          <StatusBadge p={B} label="Reference only" tone="neutral" />
          <CopyButton text={combinedText} label="Copy all" />
          <IconButton
            icon={X}
            label="Close prompt reader"
            onClick={onClose}
            size={32}
            iconSize={16}
            style={{ color: B.ink2, borderRadius: 8 }}
          />
        </header>

        <StatusNote
          p={B}
          label={PROMPT_READER_STATUS.label}
          tone="neutral"
          detail={
            <>
              Compiled live from the prompt source files.{' '}
              {PROMPT_READER_STATUS.detail} {runtimeStatus.detail}
            </>
          }
        />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
          }}
        >
          <Toc items={allItems} activeId={activeId} onJump={jump} />
          <div
            id="prompt-reader-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 28px 60px',
            }}
          >
            {allItems.map(({ section, mode }) => (
              <SectionCard key={section.id} section={section} mode={mode} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
