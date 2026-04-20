'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import { ToolBadge } from '@/components/tool-badge'
import { useFlowActions, useFlowState } from '../../store'
import type { Turn } from '../../types'
import { B } from './palette'
import { simulateReplyAction } from './simulator-actions'

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

  const handleSend = async () => {
    const text = input.trim()
    if (!text || pending) return
    actions.simSend(text)
    setInput('')
    setPending(true)

    const history = [
      ...state.conversation.map((t) => ({
        role:
          t.role === 'prospect' ? ('user' as const) : ('assistant' as const),
        content: t.text,
      })),
      { role: 'user' as const, content: text },
    ]

    const result = await simulateReplyAction({
      brand: state.flow.brand,
      messages: history,
    })

    if (result.success) {
      const turn: Turn = {
        role: 'bot',
        text: result.data.replyText || '(no reply text)',
        t: 'now',
        toolCalls: result.data.toolCalls.map((c) => ({
          name: c.name,
          input: c.input,
        })),
      }
      actions.simReceive(turn)
    } else {
      actions.simReceive({
        role: 'system',
        text: result.error,
        t: 'now',
        error: true,
      })
    }
    setPending(false)
  }

  return (
    <div
      style={{
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 340,
        height: 460,
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
          Simulator · Live (matches production)
        </span>
        <span style={{ flex: 1 }} />
        <IconButton
          icon={RotateCcw}
          label="Reset conversation"
          onClick={() => actions.simReset()}
          size={22}
          iconSize={12}
          style={{ color: B.panel, opacity: 0.6 }}
        />
        <IconButton
          icon={X}
          label="Close simulator"
          onClick={onClose}
          size={22}
          iconSize={14}
          style={{ color: B.panel, opacity: 0.7 }}
        />
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
          gap: 10,
        }}
      >
        {state.conversation.length === 0 && !pending && (
          <div
            style={{
              color: B.ink3,
              fontSize: 11.5,
              textAlign: 'center',
              padding: '24px 12px',
              lineHeight: 1.5,
            }}
          >
            Type a message as the prospect.
            <br />
            Replies come from the real system prompt via Claude.
          </div>
        )}
        {state.conversation.map((m, i) => {
          if (m.role === 'system') {
            return (
              <div
                key={i}
                style={{
                  alignSelf: 'center',
                  fontSize: 11,
                  color: m.error ? '#8E2A2A' : B.ink3,
                  background: m.error ? '#FBEFEF' : B.panel,
                  padding: '5px 10px',
                  borderRadius: 999,
                  border: `1px solid ${m.error ? '#F5D9D9' : B.line}`,
                }}
              >
                {m.error ? 'Error: ' : ''}
                {m.text}
              </div>
            )
          }
          return (
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
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  alignItems: m.role === 'prospect' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    padding: '7px 10px',
                    borderRadius: 12,
                    background: m.role === 'prospect' ? B.accent : B.panel,
                    color: m.role === 'prospect' ? B.panel : B.ink,
                    fontSize: 12.5,
                    lineHeight: 1.45,
                  }}
                >
                  {m.text}
                </div>
                {m.role === 'bot' && m.toolCalls && m.toolCalls.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                  >
                    {m.toolCalls.map((tc, j) => (
                      <ToolBadge
                        key={j}
                        call={tc}
                        bg={B.accentSoft}
                        ink={B.accentInk}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
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
              thinking…
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
              void handleSend()
            }
          }}
          placeholder="Type as prospect…"
          disabled={pending}
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
          onClick={() => void handleSend()}
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
