'use client'

import Link from 'next/link'
import DirectionB from './directions/b-stage'

export default function FlowBuilder() {
  return (
    <>
      {/* Desktop (>= 1024px): full flow builder. Mobile/tablet: dedicated gate.
          The multi-panel canvas + inspector + simulator cannot usefully coexist
          below 1024px — every attempt to responsive-collapse has reduced it to
          a checklist that's slower to author with than pen-and-paper. Per the
          UX persona review decision (#7), we gate instead of degrade. */}
      <div className="hidden h-full w-full lg:block">
        <DirectionB />
      </div>
      <div className="flex h-full w-full lg:hidden">
        <MobileGate />
      </div>
    </>
  )
}

function MobileGate() {
  return (
    <div
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
        phone or small tablet. Open this page on a screen at least 1024px wide.
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
      <Link
        href="/dashboard/conversations"
        style={{
          marginTop: 8,
          padding: '10px 18px',
          borderRadius: 10,
          background: '#161528',
          color: 'white',
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        Open conversations →
      </Link>
    </div>
  )
}
