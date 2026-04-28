import type { ReactNode } from 'react'
import type { DraftSyncStatus } from './store'
import type { Palette } from './types'

type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

export interface FlowStatusMessage {
  label: string
  detail: ReactNode
}

export function getDraftWorkspaceStatus(
  dirtySincePublish: boolean
): FlowStatusMessage {
  return dirtySincePublish
    ? {
        label: 'Unpublished edits',
        detail:
          'The shared draft has editor changes that are not live in Instagram yet.',
      }
    : {
        label: 'No unpublished edits',
        detail: 'There are no unpublished editor changes right now.',
      }
}

export function getDraftSaveStatus(
  syncStatus: DraftSyncStatus
): FlowStatusMessage {
  switch (syncStatus) {
    case 'loading':
      return {
        label: 'Loading draft',
        detail: 'Checking for the latest shared draft for this flow.',
      }
    case 'pending':
      return {
        label: 'Save pending',
        detail: 'A draft change is queued and will sync in a moment.',
      }
    case 'saving':
      return {
        label: 'Saving draft',
        detail: 'Saving the shared draft now.',
      }
    case 'error':
      return {
        label: 'Save failed',
        detail:
          'The draft changed locally, but the most recent save did not complete.',
      }
    case 'saved':
    default:
      return {
        label: 'Saved',
        detail: 'All shared draft changes are saved.',
      }
  }
}

export function getLiveRuntimeStatus(): FlowStatusMessage {
  return {
    label: 'Live',
    detail:
      'New conversations are using the current production prompt until publish wiring lands.',
  }
}

export function getSimulatorStatus(compileEnabled: boolean): FlowStatusMessage {
  return compileEnabled
    ? {
        label: 'Draft preview',
        detail:
          "In this environment, the simulator runs Claude against the live prompt plus the selected block's draft overrides.",
      }
    : {
        label: 'Live prompt only',
        detail:
          'In this environment, the simulator runs the current production prompt without draft overrides.',
      }
}

export const BRAND_INBOX_STATUS: FlowStatusMessage = {
  label: 'All flows',
  detail:
    "Right now we show all of VendingPreneurs' conversations together. Per-flow filtering is coming soon.",
}

export const VARIABLE_REFERENCE_STATUS: FlowStatusMessage = {
  label: 'Reference only',
  detail:
    'This page shows the current shared draft values and where each variable is captured. Creating variables and row-level actions is not wired yet.',
}

export const PROMPT_READER_STATUS: FlowStatusMessage = {
  label: 'Reference source',
  detail:
    'This reader shows the compiled live prompt sections. Inspect here; make draft edits in the Flow Builder panels.',
}

export const RELEASE_STATUS_INTRO: FlowStatusMessage = {
  label: 'Release status',
  detail:
    'Use this page to check what is saved in the shared draft versus what is live today. Publish controls and release history are not wired yet.',
}

function toneStyles(p: Palette, tone: Tone) {
  switch (tone) {
    case 'info':
      return {
        bg: p.accentSoft,
        fg: p.accentInk,
        border: p.accentSoft,
      }
    case 'warning':
      return {
        bg: '#FBE7D9',
        fg: '#8B4316',
        border: '#F1CDAF',
      }
    case 'success':
      return {
        bg: '#E6EFE1',
        fg: '#3A5A32',
        border: '#CFE0C7',
      }
    case 'danger':
      return {
        bg: '#FBEFEF',
        fg: '#8E2A2A',
        border: '#F5D9D9',
      }
    case 'neutral':
    default:
      return {
        bg: p.lineSoft,
        fg: p.ink2,
        border: p.line,
      }
  }
}

export function StatusBadge({
  p,
  label,
  tone = 'info',
}: {
  p: Palette
  label: string
  tone?: Tone
}) {
  const colors = toneStyles(p, tone)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 9px',
        borderRadius: 999,
        background: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.border}`,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: colors.fg,
          opacity: 0.85,
        }}
      />
      {label}
    </span>
  )
}

export function StatusNote({
  p,
  label,
  detail,
  tone = 'info',
  role,
  ariaLive,
}: {
  p: Palette
  label: string
  detail: ReactNode
  tone?: Tone
  role?: string
  ariaLive?: 'off' | 'polite' | 'assertive'
}) {
  const colors = toneStyles(p, tone)
  return (
    <div
      role={role}
      aria-live={ariaLive}
      style={{
        padding: '12px 16px',
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        color: colors.fg,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12.5,
          lineHeight: 1.5,
        }}
      >
        {detail}
      </div>
    </div>
  )
}

export function StatusCard({
  p,
  eyebrow,
  title,
  detail,
  tone = 'neutral',
  children,
}: {
  p: Palette
  eyebrow: string
  title: ReactNode
  detail: ReactNode
  tone?: Tone
  children?: ReactNode
}) {
  const colors = toneStyles(p, tone)
  return (
    <section
      style={{
        padding: '18px 18px 16px',
        background: p.panel,
        border: `1px solid ${p.line}`,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          color: p.ink3,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 18,
          fontWeight: 600,
          color: p.ink,
          lineHeight: 1.25,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: colors.fg,
            opacity: 0.85,
            flexShrink: 0,
          }}
        />
        <span>{title}</span>
      </div>
      <div
        style={{
          fontSize: 13,
          color: p.ink2,
          lineHeight: 1.55,
        }}
      >
        {detail}
      </div>
      {children}
    </section>
  )
}
