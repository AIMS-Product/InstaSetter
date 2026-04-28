'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchFlowRuntimeAction, setFlowRuntimeAction } from './actions'
import DirectionB from './directions/b-stage'
import { B } from './directions/b-stage/palette'

export default function FlowBuilder({
  flowId,
  brand,
  bookingUrl,
  botEnabled,
}: {
  flowId: string
  brand: string
  bookingUrl: string
  botEnabled: boolean
}) {
  const [gateOverride, setGateOverride] = useState(false)

  if (gateOverride) {
    return (
      <div className="h-full w-full">
        <DirectionB
          flowId={flowId}
          brand={brand}
          bookingUrl={bookingUrl}
          botEnabled={botEnabled}
        />
      </div>
    )
  }

  return (
    <>
      {/* Larger tablet/desktop (>= 900px): full flow builder. Mobile: dedicated gate.
          The multi-panel canvas + inspector + simulator cannot usefully coexist
          below 900px — every attempt to responsive-collapse has reduced it to
          a checklist that's slower to author with than pen-and-paper. Per the
          UX persona review decision (#7), we gate instead of degrade. */}
      <div className="hidden h-full w-full min-[900px]:block">
        <DirectionB
          flowId={flowId}
          brand={brand}
          bookingUrl={bookingUrl}
          botEnabled={botEnabled}
        />
      </div>
      <div className="flex h-full w-full min-[900px]:hidden">
        <MobileGate
          flowId={flowId}
          botEnabled={botEnabled}
          onContinue={() => setGateOverride(true)}
        />
      </div>
    </>
  )
}

function MobileGate({
  flowId,
  botEnabled,
  onContinue,
}: {
  flowId: string
  botEnabled: boolean
  onContinue: () => void
}) {
  const subject = 'Open Flow Builder'
  const [runtimeEnabled, setRuntimeEnabled] = useState(botEnabled)
  const [runtimeBusy, setRuntimeBusy] = useState(false)

  useEffect(() => {
    let alive = true
    fetchFlowRuntimeAction({ flowId }).then((runtime) => {
      if (!alive || !runtime) return
      setRuntimeEnabled(runtime.botEnabled)
    })
    return () => {
      alive = false
    }
  }, [flowId])

  const setPause = async (paused: boolean) => {
    setRuntimeBusy(true)
    const runtime = await setFlowRuntimeAction({ flowId, paused })
    if (runtime) setRuntimeEnabled(runtime.botEnabled)
    setRuntimeBusy(false)
  }

  const shareLink = async () => {
    const url =
      typeof window === 'undefined'
        ? `/dashboard/flows/${flowId}`
        : window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: subject, url })
      } catch {
        return
      }
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        `Open this Flow Builder on a larger screen: ${url}`
      )}`
    }
  }

  return (
    <main
      id="main"
      tabIndex={-1}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: B.bg,
        color: B.ink,
        textAlign: 'center',
        gap: 16,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${B.accent}, #7B6FE6)`,
          display: 'grid',
          placeItems: 'center',
          color: 'white',
          fontSize: 22,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        i
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-instrument-serif), ui-serif, Georgia, serif',
          fontSize: 26,
          fontWeight: 400,
          letterSpacing: -0.2,
          margin: 0,
          maxWidth: 320,
        }}
      >
        Monitor here. Edit on desktop.
      </h1>
      <p
        style={{
          fontSize: 14,
          color: B.ink2,
          lineHeight: 1.55,
          margin: 0,
          maxWidth: 340,
        }}
      >
        The full editor uses a multi-panel canvas that needs at least 900px.
        This screen keeps the operational links available while you&rsquo;re
        away from a desk.
      </p>
      <div
        style={{
          width: '100%',
          maxWidth: 340,
          border: `1px solid ${B.line}`,
          borderRadius: 12,
          background: B.panel,
          padding: 14,
          display: 'grid',
          gap: 8,
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 11, color: B.ink3, fontWeight: 700 }}>
          BOT STATUS
        </div>
        <div
          style={{
            fontSize: 15,
            color: runtimeEnabled ? '#3A5A32' : '#8B231F',
            fontWeight: 700,
          }}
        >
          {runtimeEnabled ? 'Bot active' : 'Bot paused'}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: B.ink2,
            lineHeight: 1.45,
          }}
        >
          Inbox and conversation monitoring are available on this device. Use a
          larger screen for canvas editing.
        </div>
        <button
          type="button"
          disabled={runtimeBusy}
          onClick={() => setPause(runtimeEnabled)}
          style={{
            minHeight: 44,
            width: '100%',
            borderRadius: 10,
            border: `1px solid ${runtimeEnabled ? '#E6B8A2' : '#BCD6B0'}`,
            background: runtimeEnabled ? '#FFF4EF' : '#EFF8EA',
            color: runtimeEnabled ? '#8B231F' : '#31552E',
            fontSize: 13,
            fontWeight: 700,
            cursor: runtimeBusy ? 'wait' : 'pointer',
          }}
        >
          {runtimeBusy
            ? 'Updating...'
            : runtimeEnabled
              ? 'Pause bot'
              : 'Resume bot'}
        </button>
      </div>
      <p
        style={{
          fontSize: 13,
          color: B.ink3,
          lineHeight: 1.55,
          margin: 0,
          maxWidth: 340,
        }}
      >
        You can still monitor live conversations on your phone.
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          marginTop: 8,
          width: '100%',
          maxWidth: 340,
        }}
      >
        <Link
          href="/dashboard/conversations"
          style={{
            minHeight: 48,
            width: '100%',
            maxWidth: 260,
            padding: '14px 22px',
            borderRadius: 10,
            background: B.ink,
            color: 'white',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Open conversations →
        </Link>
        <button
          type="button"
          onClick={onContinue}
          style={{
            minHeight: 48,
            width: '100%',
            maxWidth: 260,
            padding: '13px 20px',
            borderRadius: 10,
            border: `1px solid ${B.line}`,
            background: 'white',
            color: B.ink,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Continue anyway
        </button>
        <button
          type="button"
          onClick={() => {
            void shareLink()
          }}
          style={{
            minHeight: 44,
            border: 'none',
            background: 'transparent',
            color: B.accent,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'inherit',
          }}
        >
          Share this link
        </button>
      </div>
    </main>
  )
}
