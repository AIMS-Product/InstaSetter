'use client'

import { useEffect } from 'react'

/**
 * Route-level error boundary per Next.js 16 App Router conventions. Logs the
 * error so we have a Sentry breadcrumb and surfaces a friendly fallback that
 * keeps the operator on the page instead of dumping them onto the global
 * 500 surface.
 */
export default function CreativesReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('creative_funnel.error', {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <main
      id="main"
      tabIndex={-1}
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px 40px',
        background: '#FAFAFB',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily:
              'var(--font-instrument-serif), ui-serif, Georgia, serif',
            fontSize: 24,
            fontWeight: 400,
            color: '#161528',
            margin: '0 0 8px',
          }}
        >
          Creative funnel hit a snag
        </h1>
        <p
          style={{
            fontSize: 13,
            color: '#6B6A7E',
            lineHeight: 1.5,
            margin: '0 0 18px',
          }}
        >
          The report could not finish loading. Confirm the latest database
          migration has been applied, then try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 0,
            borderRadius: 8,
            background: '#4F46BA',
            color: 'white',
            fontSize: 13,
            fontWeight: 700,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </main>
  )
}
