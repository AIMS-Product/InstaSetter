'use client'

import { useEffect, useRef, useState } from 'react'
import { BLOCK_BY_TYPE, blockColor } from '../../shared-data'
import { useFlowActions, useFlowState } from '../../store'
import type { BlockType, Turn } from '../../types'
import { B } from './palette'

const PROSPECT_PATTERNS: Record<string, RegExp> = {
  location:
    /\b(dallas|austin|houston|chicago|new york|la|nyc|sydney|small town|oklahoma|city)\b/i,
  money: /\b\d+[kK]?\b|\$/,
  objection:
    /(scam|mlm|expensive|too much|can't|cant|not sure|hesitant|concern|worried)/i,
  ready:
    /(ready|let's go|go for it|sounds good|sign me up|when can we|book me)/i,
  silence: /.{0,3}$/,
}

function pickNextBlock(
  current: BlockType,
  prospectMessage: string,
  nodes: { id: BlockType; branches: { target: BlockType; when: string }[] }[]
): BlockType {
  const node = nodes.find((n) => n.id === current)
  if (!node || node.branches.length === 0) return current
  // Heuristic: if prospect sounds like an objection, prefer branch with 'objection' in when
  if (PROSPECT_PATTERNS.objection.test(prospectMessage)) {
    const objBranch = node.branches.find((b) => /objection/i.test(b.when))
    if (objBranch) return objBranch.target
  }
  // If message contains a location keyword and we're in opening, move to qualifier
  if (
    current === 'opening' &&
    PROSPECT_PATTERNS.location.test(prospectMessage)
  ) {
    const locBranch = node.branches.find((b) => /location/i.test(b.when))
    if (locBranch) return locBranch.target
  }
  // If we're in qualifier and they've given us motivation-like words, go to booking
  if (current === 'qualifier') {
    const bookBranch = node.branches.find((b) =>
      /motivation|qualified/i.test(b.when)
    )
    if (bookBranch) return bookBranch.target
  }
  // Default: first branch
  return node.branches[0]!.target
}

function generateBotReply(
  block: { examples: string[]; goal: string; type: BlockType } | undefined,
  prospectMessage: string
): string {
  if (!block) return 'Got it.'
  if (block.examples.length > 0) {
    const idx = Math.floor(
      (prospectMessage.length + Date.now()) % block.examples.length
    )
    return block.examples[idx]!
  }
  return block.goal || 'Got it.'
}

export default function BSimFloat({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const state = useFlowState()
  const actions = useFlowActions()
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [state.conversation.length, pending])

  if (!open) return null

  const handleSend = () => {
    const text = input.trim()
    if (!text || pending) return
    actions.simSend(text)
    setInput('')
    setPending(true)
    setTimeout(() => {
      const nextBlockId = pickNextBlock(
        state.simActiveBlock ?? 'opening',
        text,
        state.flow.nodes
      )
      const nextBlock = state.flow.nodes.find((n) => n.id === nextBlockId)
      const reply = generateBotReply(nextBlock, text)
      const turn: Turn = {
        role: 'bot',
        text: reply,
        block: nextBlockId,
        t: 'now',
      }
      actions.simReceive(turn)
      setPending(false)
    }, 500)
  }

  return (
    <div
      style={{
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 340,
        height: 440,
        background: B.panel,
        borderRadius: 14,
        boxShadow:
          '0 16px 40px rgba(22,21,40,0.16), 0 0 0 1px rgba(22,21,40,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 20,
      }}
    >
      <div
        style={{
          padding: '11px 14px',
          background: B.ink,
          color: B.panel,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#6FEB97',
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 500 }}>
          Simulator · {state.simMode === 'fast' ? 'Fast mode' : state.simMode}
        </span>
        <span style={{ flex: 1 }} />
        <span
          onClick={() => actions.simReset()}
          title="Reset conversation"
          style={{
            fontSize: 11,
            opacity: 0.6,
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          ↻
        </span>
        <span
          onClick={onClose}
          style={{
            fontSize: 14,
            cursor: 'pointer',
            padding: '0 4px',
            opacity: 0.7,
          }}
        >
          ×
        </span>
      </div>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 12,
          background: B.lineSoft,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {state.conversation.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: m.role === 'prospect' ? 'row-reverse' : 'row',
            }}
          >
            <div
              style={{
                maxWidth: '82%',
                padding: '7px 10px',
                borderRadius: 12,
                background: m.role === 'prospect' ? B.accent : B.panel,
                color: m.role === 'prospect' ? B.panel : B.ink,
                fontSize: 12.5,
                lineHeight: 1.45,
                position: 'relative',
              }}
            >
              {m.text}
              {m.role === 'bot' && m.block && (
                <div
                  style={{
                    position: 'absolute',
                    top: -8,
                    left: 8,
                    fontSize: 9,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: B.panel,
                    color: B.ink3,
                    border: `1px solid ${B.line}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: blockColor(m.block),
                    }}
                  />
                  {BLOCK_BY_TYPE[m.block]?.label}
                </div>
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div style={{ display: 'flex' }}>
            <div
              style={{
                padding: '7px 10px',
                borderRadius: 12,
                background: B.panel,
                color: B.ink3,
                fontSize: 12,
                fontStyle: 'italic',
              }}
            >
              Mike is typing…
            </div>
          </div>
        )}
      </div>
      <div
        style={{
          padding: 10,
          display: 'flex',
          gap: 6,
          borderTop: `1px solid ${B.line}`,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Type as prospect…"
          style={{
            flex: 1,
            padding: '7px 10px',
            borderRadius: 7,
            border: `1px solid ${B.line}`,
            background: B.panel,
            fontSize: 12,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || pending}
          style={{
            padding: '0 12px',
            borderRadius: 7,
            border: 'none',
            background: B.accent,
            color: B.panel,
            fontSize: 11,
            cursor: input.trim() && !pending ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            opacity: input.trim() && !pending ? 1 : 0.5,
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
