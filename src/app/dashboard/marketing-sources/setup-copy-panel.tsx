'use client'

import { Check, Copy, Smartphone } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useState } from 'react'

type CopyState = 'idle' | 'variables' | 'tag' | 'all' | 'link' | 'error'

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: '1px solid #D9DAE5',
  borderRadius: 8,
  background: 'white',
  color: '#4B4A5E',
  fontSize: 12,
  fontWeight: 800,
  padding: '7px 10px',
  cursor: 'pointer',
} satisfies CSSProperties

function formatVariables(variables: Record<string, string>) {
  return Object.entries(variables)
    .map(([key, value]) => `${key} = ${value}`)
    .join('\n')
}

function formatAll(variables: Record<string, string>, tag: string) {
  return `SendPulse variables:\n${formatVariables(variables)}\n\nSendPulse tag:\n${tag}`
}

export function SetupCopyPanel({
  variables,
  tag,
  refLink,
  refLinkError,
}: {
  variables: Record<string, string>
  tag: string
  refLink?: string
  refLinkError?: string
}) {
  const [copied, setCopied] = useState<CopyState>('idle')

  async function copy(value: string, state: CopyState) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(state)
      window.setTimeout(() => setCopied('idle'), 1600)
    } catch {
      setCopied('error')
    }
  }

  return (
    <div
      style={{
        borderLeft: '1px solid #EEEFF3',
        paddingLeft: 18,
        display: 'grid',
        gap: 10,
        fontSize: 12,
        color: '#4B4A5E',
      }}
    >
      <div style={{ fontWeight: 800, color: '#161528' }}>
        <Copy aria-hidden size={13} style={{ marginRight: 6 }} />
        Copy these into SendPulse
      </div>
      <div>
        In the matching SendPulse flow, add one action that sets these
        variables.
      </div>
      <pre
        style={{
          margin: 0,
          padding: 10,
          borderRadius: 8,
          background: '#F7F7FA',
          overflow: 'auto',
          lineHeight: 1.55,
        }}
      >
        {formatVariables(variables)}
      </pre>
      <div>
        Add a second action that applies this tag: <code>{tag}</code>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          title="Copy only the variable names and values to paste into SendPulse."
          style={buttonStyle}
          onClick={() => copy(formatVariables(variables), 'variables')}
        >
          {copied === 'variables' ? (
            <Check aria-hidden size={13} />
          ) : (
            <Copy aria-hidden size={13} />
          )}
          Copy variables
        </button>
        <button
          type="button"
          title="Copy only the source tag to add in a separate SendPulse action."
          style={buttonStyle}
          onClick={() => copy(tag, 'tag')}
        >
          {copied === 'tag' ? (
            <Check aria-hidden size={13} />
          ) : (
            <Copy aria-hidden size={13} />
          )}
          Copy tag
        </button>
        <button
          type="button"
          title="Copy both SendPulse setup steps in one note."
          style={buttonStyle}
          onClick={() => copy(formatAll(variables, tag), 'all')}
        >
          {copied === 'all' ? (
            <Check aria-hidden size={13} />
          ) : (
            <Copy aria-hidden size={13} />
          )}
          Copy all
        </button>
      </div>
      <div style={{ color: copied === 'error' ? '#9B1C1C' : '#6B6A7E' }}>
        {copied === 'error'
          ? 'Copy failed. Select the setup text and copy it manually.'
          : copied === 'idle'
            ? 'Confirm global incoming message webhooks are enabled. Manual flow trigger setup is required for v1.'
            : 'Copied.'}
      </div>

      {(refLink || refLinkError) && (
        <div
          style={{
            marginTop: 4,
            paddingTop: 12,
            borderTop: '1px dashed #D9DAE5',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 800, color: '#161528' }}>
            Instagram deep link
          </div>
          {refLink ? (
            <>
              <div>
                Paste this URL into the Meta Ads Manager destination field, the
                IG bio link, or anywhere a click should hand the prospect over
                to the SendPulse flow with this source&apos;s UTM tags pre-set.
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 10,
                  borderRadius: 8,
                  background: '#F7F7FA',
                  overflow: 'auto',
                  lineHeight: 1.55,
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {refLink}
              </pre>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  title="Copy the Instagram deep link"
                  style={buttonStyle}
                  onClick={() => copy(refLink, 'link')}
                >
                  {copied === 'link' ? (
                    <Check aria-hidden size={13} />
                  ) : (
                    <Copy aria-hidden size={13} />
                  )}
                  Copy link
                </button>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#7C2D12',
                  background: '#FFF7ED',
                  border: '1px solid #FDBA74',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                <Smartphone aria-hidden size={13} />
                Test on Instagram mobile only — desktop browsers ignore the ref
                tag.
              </div>
            </>
          ) : (
            <div style={{ color: '#9B1C1C' }}>
              Could not build deep link: {refLinkError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
