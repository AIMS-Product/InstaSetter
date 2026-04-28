'use client'

import Link from 'next/link'
import { useState } from 'react'
import DirectionB from './directions/b-stage'

export default function FlowBuilder({
  flowId,
  brand,
  bookingUrl,
}: {
  flowId: string
  brand: string
  bookingUrl: string
}) {
  const [gateOverride, setGateOverride] = useState(false)

  if (gateOverride) {
    return (
      <div className="h-full w-full">
        <DirectionB flowId={flowId} brand={brand} bookingUrl={bookingUrl} />
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
        <DirectionB flowId={flowId} brand={brand} bookingUrl={bookingUrl} />
      </div>
      <div className="flex h-full w-full min-[900px]:hidden">
        <MobileGate flowId={flowId} onContinue={() => setGateOverride(true)} />
      </div>
    </>
  )
}

function MobileGate({
  flowId,
  onContinue,
}: {
  flowId: string
  onContinue: () => void
}) {
  const subject = 'Open Flow Builder'
  const body = `Open this Flow Builder on a larger screen: /dashboard/flows/${flowId}`
  const shareHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

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
        background: '#FAFAFB',
        color: '#161528',
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
          background: 'linear-gradient(135deg, #5E52C7, #7B6FE6)',
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
        Flow Builder needs a desktop
      </h1>
      <p
        style={{
          fontSize: 14,
          color: '#4B4A5E',
          lineHeight: 1.55,
          margin: 0,
          maxWidth: 340,
        }}
      >
        Editing the flow uses a multi-panel canvas that doesn&rsquo;t fit on a
        phone or small tablet. Open this page on a screen at least 900px wide.
      </p>
      <p
        style={{
          fontSize: 13,
          color: '#6B6A7E',
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
            background: '#161528',
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
            border: '1px solid #D9D8E6',
            background: 'white',
            color: '#161528',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Continue anyway
        </button>
        <a
          href={shareHref}
          style={{
            minHeight: 44,
            color: '#5E52C7',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Email this link to myself
        </a>
      </div>
    </main>
  )
}
