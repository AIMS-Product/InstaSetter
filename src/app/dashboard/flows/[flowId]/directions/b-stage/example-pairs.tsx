'use client'

import type { ExamplePair } from '../../types'
import { B } from './palette'

export function ExamplePairs({
  pairs,
  emptyHint,
}: {
  pairs: ExamplePair[]
  emptyHint?: string
}) {
  if (pairs.length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: B.ink3,
          fontStyle: 'italic',
          padding: '8px 0',
        }}
      >
        {emptyHint ?? 'No paired examples in the source section yet.'}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pairs.map((pair, i) => (
        <PairCard key={i} pair={pair} />
      ))}
    </div>
  )
}

function PairCard({ pair }: { pair: ExamplePair }) {
  return (
    <div
      style={{
        background: B.bg,
        borderRadius: 10,
        border: `1px solid ${B.line}`,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {pair.prospect && (
        <Row
          label="Prospect"
          body={pair.prospect}
          labelBg="#E5E6EC"
          labelColor="#4B4A5E"
          bubbleBg={B.panel}
          bubbleColor={B.ink}
        />
      )}
      {pair.good && (
        <Row
          label="✓ Good"
          body={pair.good}
          labelBg="#DFF3E4"
          labelColor="#1F6B3A"
          bubbleBg="#F1FBF3"
          bubbleColor="#1A3A22"
        />
      )}
      {pair.bad && (
        <Row
          label="✗ Bad"
          body={pair.bad}
          labelBg="#F5D9D9"
          labelColor="#8E2A2A"
          bubbleBg="#FBEFEF"
          bubbleColor="#4E1616"
        />
      )}
    </div>
  )
}

function Row({
  label,
  body,
  labelBg,
  labelColor,
  bubbleBg,
  bubbleColor,
}: {
  label: string
  body: string
  labelBg: string
  labelColor: string
  bubbleBg: string
  bubbleColor: string
}) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div
        style={{
          flexShrink: 0,
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: labelColor,
          background: labelBg,
          padding: '4px 7px',
          borderRadius: 5,
          minWidth: 60,
          textAlign: 'center',
          marginTop: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          background: bubbleBg,
          color: bubbleColor,
          padding: '9px 12px',
          borderRadius: 8,
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        {body}
      </div>
    </div>
  )
}
