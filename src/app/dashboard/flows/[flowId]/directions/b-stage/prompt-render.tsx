'use client'

import { SERIF_FAMILY } from '../../shared-data'
import { B } from './palette'

interface OlItem {
  text: string
  subItems: string[]
}

type Node =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: OlItem[] }
  | { kind: 'examples'; children: ExampleNode[] }

interface ExampleNode {
  prospect?: string
  good?: string
  bad?: string
}

function takeExamples(lines: string[], start: number): [ExampleNode[], number] {
  let i = start + 1
  const out: ExampleNode[] = []
  while (i < lines.length && lines[i].trim() !== '</examples>') {
    if (lines[i].trim() === '<example>') {
      const node: ExampleNode = {}
      i++
      while (i < lines.length && lines[i].trim() !== '</example>') {
        const raw = lines[i].trim()
        const m = raw.match(/^<(prospect|good_reply|bad_reply)>(.*)<\/\1>$/)
        if (m) {
          const tag = m[1]
          const content = m[2]
          if (tag === 'prospect') node.prospect = content
          else if (tag === 'good_reply') node.good = content
          else if (tag === 'bad_reply') node.bad = content
        }
        i++
      }
      out.push(node)
      i++
    } else {
      i++
    }
  }
  return [out, i + 1]
}

export function parsePrompt(text: string): Node[] {
  const lines = text.split('\n')
  const out: Node[] = []
  let i = 0
  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()
    if (line === '') {
      i++
      continue
    }
    if (line.startsWith('## ')) {
      out.push({ kind: 'h2', text: line.slice(3) })
      i++
      continue
    }
    if (line.startsWith('### ')) {
      out.push({ kind: 'h3', text: line.slice(4) })
      i++
      continue
    }
    if (line === '<examples>') {
      const [children, next] = takeExamples(lines, i)
      out.push({ kind: 'examples', children })
      i = next
      continue
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = []
      let current: string | null = null
      const flush = () => {
        if (current !== null) items.push(current)
      }
      while (i < lines.length) {
        const raw = lines[i]
        const t = raw.trim()
        if (t === '') {
          let j = i + 1
          while (j < lines.length && lines[j].trim() === '') j++
          if (j >= lines.length) {
            i = j
            break
          }
          const next = lines[j]
          const nextT = next.trim()
          if (
            nextT.startsWith('- ') ||
            nextT.startsWith('* ') ||
            next.startsWith('  ') ||
            next.startsWith('\t')
          ) {
            i = j
            continue
          }
          break
        }
        if (t.startsWith('- ') || t.startsWith('* ')) {
          if (current !== null) items.push(current)
          current = t.slice(2)
          i++
          continue
        }
        if (raw.startsWith('  ') || raw.startsWith('\t')) {
          if (current !== null) current += ' ' + t
          i++
          continue
        }
        break
      }
      flush()
      out.push({ kind: 'ul', items })
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      const items: OlItem[] = []
      let current: OlItem | null = null
      while (i < lines.length) {
        const raw = lines[i]
        const t = raw.trim()
        if (t === '') {
          let j = i + 1
          while (j < lines.length && lines[j].trim() === '') j++
          if (j >= lines.length) {
            i = j
            break
          }
          const next = lines[j]
          const nextT = next.trim()
          if (
            /^\d+\.\s/.test(nextT) ||
            next.startsWith('  ') ||
            next.startsWith('\t')
          ) {
            i = j
            continue
          }
          break
        }
        if (/^\d+\.\s/.test(t)) {
          if (current !== null) items.push(current)
          current = { text: t.replace(/^\d+\.\s/, ''), subItems: [] }
          i++
          continue
        }
        const indented = raw.startsWith('  ') || raw.startsWith('\t')
        if (indented && (t.startsWith('- ') || t.startsWith('* '))) {
          if (current !== null) current.subItems.push(t.slice(2))
          i++
          continue
        }
        if (indented) {
          if (current !== null) current.text += ' ' + t
          i++
          continue
        }
        break
      }
      if (current !== null) items.push(current)
      out.push({ kind: 'ol', items })
      continue
    }
    const para: string[] = [line]
    i++
    while (i < lines.length) {
      const next = lines[i].trim()
      if (
        next === '' ||
        next.startsWith('## ') ||
        next.startsWith('### ') ||
        next.startsWith('- ') ||
        next.startsWith('* ') ||
        /^\d+\.\s/.test(next) ||
        next === '<examples>'
      )
        break
      para.push(next)
      i++
    }
    out.push({ kind: 'para', text: para.join(' ') })
  }
  return out
}

function Inline({ text }: { text: string }) {
  if (typeof text !== 'string') return null
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <strong key={i} style={{ fontWeight: 600, color: B.ink }}>
              {p.slice(2, -2)}
            </strong>
          )
        }
        if (p.startsWith('`') && p.endsWith('`')) {
          return (
            <code
              key={i}
              style={{
                fontFamily:
                  'var(--font-jetbrains-mono), ui-monospace, monospace',
                fontSize: '0.9em',
                background: B.lineSoft,
                color: B.ink,
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              {p.slice(1, -1)}
            </code>
          )
        }
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

function ExamplePair({ node }: { node: ExampleNode }) {
  const row = (
    label: string,
    body: string | undefined,
    labelColor: string,
    labelBg: string,
    bubbleBg: string,
    bubbleColor: string
  ) => {
    if (!body) return null
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
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        padding: 14,
        background: B.bg,
        borderRadius: 10,
        border: `1px solid ${B.line}`,
      }}
    >
      {row('Prospect', node.prospect, '#4B4A5E', '#E5E6EC', B.panel, B.ink)}
      {row('✓ Good', node.good, '#1F6B3A', '#DFF3E4', '#F1FBF3', '#1A3A22')}
      {row('✗ Bad', node.bad, '#8E2A2A', '#F5D9D9', '#FBEFEF', '#4E1616')}
    </div>
  )
}

export function RenderPrompt({ text }: { text: string }) {
  const nodes = parsePrompt(text)
  return (
    <div
      style={{
        fontSize: 13.5,
        lineHeight: 1.65,
        color: B.ink2,
      }}
    >
      {nodes.map((n, i) => {
        if (n.kind === 'h2') {
          return (
            <h2
              key={i}
              style={{
                fontFamily: SERIF_FAMILY,
                fontSize: 22,
                fontWeight: 400,
                color: B.ink,
                margin: i === 0 ? '0 0 14px' : '28px 0 14px',
                letterSpacing: -0.2,
              }}
            >
              {n.text}
            </h2>
          )
        }
        if (n.kind === 'h3') {
          return (
            <h3
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: B.accentInk,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                margin: '22px 0 8px',
              }}
            >
              {n.text}
            </h3>
          )
        }
        if (n.kind === 'para') {
          return (
            <p key={i} style={{ margin: '0 0 12px' }}>
              <Inline text={n.text} />
            </p>
          )
        }
        if (n.kind === 'ul') {
          return (
            <ul
              key={i}
              style={{
                margin: '0 0 14px',
                paddingLeft: 0,
                listStyle: 'none',
              }}
            >
              {n.items.map((it, j) => (
                <li
                  key={j}
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 6,
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      color: B.ink3,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    •
                  </span>
                  <span style={{ flex: 1 }}>
                    <Inline text={it} />
                  </span>
                </li>
              ))}
            </ul>
          )
        }
        if (n.kind === 'ol') {
          return (
            <ol
              key={i}
              style={{
                margin: '0 0 14px',
                paddingLeft: 0,
                listStyle: 'none',
              }}
            >
              {n.items.map((it, j) => (
                <li
                  key={j}
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      minWidth: 22,
                      height: 22,
                      borderRadius: 6,
                      background: B.accentSoft,
                      color: B.accentInk,
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'grid',
                      placeItems: 'center',
                      marginTop: 1,
                    }}
                  >
                    {j + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div>
                      <Inline text={it.text} />
                    </div>
                    {it.subItems.length > 0 && (
                      <ul
                        style={{
                          margin: '8px 0 0',
                          paddingLeft: 0,
                          listStyle: 'none',
                        }}
                      >
                        {it.subItems.map((sub, k) => (
                          <li
                            key={k}
                            style={{
                              display: 'flex',
                              gap: 10,
                              marginBottom: 5,
                              alignItems: 'flex-start',
                              fontSize: 13,
                              color: B.ink3,
                            }}
                          >
                            <span
                              style={{
                                color: B.ink3,
                                flexShrink: 0,
                                marginTop: 1,
                              }}
                            >
                              ›
                            </span>
                            <span style={{ flex: 1 }}>
                              <Inline text={sub} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )
        }
        if (n.kind === 'examples') {
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                margin: '6px 0 18px',
              }}
            >
              {n.children.map((c, j) => (
                <ExamplePair key={j} node={c} />
              ))}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
