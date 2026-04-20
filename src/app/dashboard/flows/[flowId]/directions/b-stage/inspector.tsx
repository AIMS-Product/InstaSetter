'use client'

import { BLOCK_BY_TYPE, blockColor } from '../../shared-data'
import { useFlowActions, useFlowState, useFlowStore } from '../../store'
import type { FlowNode } from '../../types'
import { B } from './palette'

function Field({
  label,
  children,
  action,
  hint,
  onAction,
}: {
  label: string
  children: React.ReactNode
  action?: string
  hint?: string
  onAction?: () => void
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: B.ink2,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </div>
        {action && (
          <button
            type="button"
            onClick={onAction}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 11,
              color: B.accentInk,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {action}
          </button>
        )}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: B.ink3, marginBottom: 6 }}>
          {hint}
        </div>
      )}
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 11px',
  borderRadius: 8,
  border: `1px solid ${B.line}`,
  background: B.panel,
  color: B.ink,
  fontSize: 13,
  lineHeight: 1.5,
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
}

const smallInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: '7px 10px',
  fontSize: 12.5,
}

function DesignTab({ block }: { block: FlowNode }) {
  const actions = useFlowActions()
  return (
    <>
      <Field label="Goal">
        <textarea
          value={block.goal}
          rows={2}
          style={inputStyle}
          onChange={(e) =>
            actions.updateBlock(block.id, 'goal', e.target.value)
          }
        />
      </Field>
      <Field
        label="How it should sound"
        hint="Inherits tone from Mike · override for this step"
      >
        <textarea
          value={block.guidance}
          rows={3}
          style={inputStyle}
          onChange={(e) =>
            actions.updateBlock(block.id, 'guidance', e.target.value)
          }
        />
      </Field>
      <Field
        label="Good examples"
        action="+ add"
        onAction={() => actions.addExample(block.id, 'New example — edit me')}
      >
        {block.examples.length === 0 && (
          <div style={{ fontSize: 12, color: B.ink3, fontStyle: 'italic' }}>
            Add a couple of sample replies so Mike has voice.
          </div>
        )}
        {block.examples.map((ex, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              marginBottom: 6,
            }}
          >
            <textarea
              value={ex}
              rows={2}
              onChange={(e) => actions.editExample(block.id, i, e.target.value)}
              style={{
                ...inputStyle,
                background: B.lineSoft,
                padding: '9px 34px 9px 11px',
                fontSize: 12.5,
              }}
            />
            <button
              type="button"
              onClick={() => actions.deleteExample(block.id, i)}
              title="Delete"
              style={{
                position: 'absolute',
                right: 6,
                top: 6,
                width: 22,
                height: 22,
                border: 'none',
                background: 'transparent',
                color: B.ink3,
                cursor: 'pointer',
                fontSize: 14,
                borderRadius: 6,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </Field>
      <Field
        label="Capture"
        action="+ rule"
        onAction={() =>
          actions.addCapture(block.id, {
            label: 'New capture',
            variable: `contact.new_${Date.now()}`,
          })
        }
      >
        {block.captures.length === 0 && (
          <div style={{ fontSize: 12, color: B.ink3, fontStyle: 'italic' }}>
            Nothing captured here.
          </div>
        )}
        {block.captures.map((c) => (
          <div
            key={c.variable}
            style={{
              padding: '8px 10px',
              background: B.panel,
              border: `1px solid ${B.line}`,
              borderRadius: 8,
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={{ color: B.ink2, flex: 1 }}>{c.label}</span>
            <code
              style={{
                fontSize: 11,
                background: B.accentSoft,
                color: B.accentInk,
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {c.variable}
            </code>
            <button
              type="button"
              onClick={() => actions.deleteCapture(block.id, c.variable)}
              title="Delete"
              style={{
                width: 20,
                height: 20,
                border: 'none',
                background: 'transparent',
                color: B.ink3,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </Field>
    </>
  )
}

function RoutingTab({ block }: { block: FlowNode }) {
  const state = useFlowState()
  const actions = useFlowActions()
  const otherNodes = state.flow.nodes.filter((n) => n.id !== block.id)
  return (
    <Field
      label="Routes out"
      action="+ route"
      onAction={() => {
        const target = otherNodes[0]?.id ?? block.id
        actions.addBranch(block.id, {
          id: `br_${Date.now()}`,
          label: 'New path',
          when: 'condition',
          target,
        })
      }}
    >
      {block.branches.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: B.ink3,
            fontStyle: 'italic',
            marginBottom: 6,
          }}
        >
          Dead end. Add a path or mark this block as a terminal.
        </div>
      )}
      {block.branches.map((br) => {
        const tgt = state.flow.nodes.find((n) => n.id === br.target)
        return (
          <div
            key={br.id}
            style={{
              padding: '10px 11px',
              background: B.panel,
              border: `1px solid ${B.line}`,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <input
                value={br.label}
                onChange={(e) =>
                  actions.editBranch(block.id, br.id, { label: e.target.value })
                }
                style={{
                  ...smallInputStyle,
                  flex: 1,
                  fontWeight: 500,
                }}
                placeholder="Label"
              />
              <button
                type="button"
                onClick={() => actions.deleteBranch(block.id, br.id)}
                title="Delete"
                style={{
                  width: 24,
                  height: 24,
                  border: 'none',
                  background: 'transparent',
                  color: B.ink3,
                  cursor: 'pointer',
                  fontSize: 14,
                  borderRadius: 6,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: B.ink3, marginBottom: 4 }}>
              When
            </div>
            <textarea
              value={br.when}
              rows={1}
              onChange={(e) =>
                actions.editBranch(block.id, br.id, { when: e.target.value })
              }
              style={{ ...smallInputStyle, marginBottom: 8 }}
              placeholder="e.g. contact.location is set"
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: B.ink2,
              }}
            >
              <span style={{ color: B.ink3 }}>→</span>
              <select
                value={br.target}
                onChange={(e) =>
                  actions.editBranch(block.id, br.id, {
                    target: e.target.value as FlowNode['id'],
                  })
                }
                style={{
                  ...smallInputStyle,
                  flex: 1,
                }}
              >
                {state.flow.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
              {tgt && (
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: blockColor(tgt.type),
                  }}
                />
              )}
            </div>
          </div>
        )
      })}
    </Field>
  )
}

function TriggersTab({ block }: { block: FlowNode }) {
  const state = useFlowState()
  const actions = useFlowActions()
  const mine = state.triggers.filter((t) => t.whenBlock === block.id)
  const others = state.flow.nodes.filter((n) => n.id !== block.id)
  const metaWarn = (t: { afterMinutes: number; mode: string }) =>
    t.afterMinutes >= 60 * 24 && t.mode === 'in_window_only'

  return (
    <Field
      label="Ambient triggers"
      hint="Fire asynchronously after this block is entered. Respect Meta's 24h messaging window."
      action="+ trigger"
      onAction={() => {
        const target = others[0]?.id ?? block.id
        actions.addTrigger({
          id: `t_${Date.now()}`,
          name: 'New trigger',
          whenBlock: block.id,
          afterMinutes: 60 * 24,
          cancelOnReply: true,
          mode: 'in_window_only',
          target,
        })
      }}
    >
      {mine.length === 0 && (
        <div style={{ fontSize: 12, color: B.ink3, fontStyle: 'italic' }}>
          No ambient triggers on this block.
        </div>
      )}
      {mine.map((t) => (
        <div
          key={t.id}
          style={{
            padding: 11,
            background: B.panel,
            border: `1px solid ${B.line}`,
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <input
              value={t.name}
              onChange={(e) =>
                actions.editTrigger(t.id, { name: e.target.value })
              }
              style={{ ...smallInputStyle, flex: 1, fontWeight: 500 }}
            />
            <button
              type="button"
              onClick={() => actions.deleteTrigger(t.id)}
              style={{
                width: 24,
                height: 24,
                border: 'none',
                background: 'transparent',
                color: B.ink3,
                cursor: 'pointer',
                fontSize: 14,
                borderRadius: 6,
              }}
            >
              ×
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, color: B.ink3 }}>After</span>
            <input
              type="number"
              min={1}
              value={t.afterMinutes}
              onChange={(e) =>
                actions.editTrigger(t.id, {
                  afterMinutes: Math.max(1, Number(e.target.value)),
                })
              }
              style={{ ...smallInputStyle, width: 80 }}
            />
            <span style={{ fontSize: 12, color: B.ink3 }}>minutes</span>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: B.ink2,
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={t.cancelOnReply}
              onChange={(e) =>
                actions.editTrigger(t.id, { cancelOnReply: e.target.checked })
              }
            />
            Cancel if prospect replies
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, color: B.ink3, width: 44 }}>Mode</span>
            <select
              value={t.mode}
              onChange={(e) =>
                actions.editTrigger(t.id, {
                  mode: e.target.value as typeof t.mode,
                })
              }
              style={{ ...smallInputStyle, flex: 1 }}
            >
              <option value="in_window_only">In 24h window only</option>
              <option value="human_agent_tag">Send with HUMAN_AGENT tag</option>
              <option value="wait_for_next_window">Wait for next window</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: B.ink3, width: 44 }}>Then</span>
            <select
              value={t.target}
              onChange={(e) =>
                actions.editTrigger(t.id, {
                  target: e.target.value as FlowNode['id'],
                })
              }
              style={{ ...smallInputStyle, flex: 1 }}
            >
              {state.flow.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          {metaWarn(t) && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 10px',
                borderRadius: 6,
                background: '#FBE7D9',
                color: '#8B4316',
                fontSize: 11.5,
                lineHeight: 1.4,
              }}
            >
              ⚠ Fires outside Instagram&rsquo;s 24h window. With{' '}
              <b>In-window only</b>, this will silently drop. Switch to{' '}
              <b>HUMAN_AGENT tag</b> mode if you need it to send anyway.
            </div>
          )}
        </div>
      ))}
    </Field>
  )
}

function DataTab({ block }: { block: FlowNode }) {
  const state = useFlowState()
  const readVars = state.variables.filter((v) =>
    block.branches.some((br) => br.when.includes(v.key))
  )
  const writeVars = block.captures
  return (
    <>
      <Field label="This block writes">
        {writeVars.length === 0 && (
          <div style={{ fontSize: 12, color: B.ink3, fontStyle: 'italic' }}>
            Nothing.
          </div>
        )}
        {writeVars.map((c) => (
          <div
            key={c.variable}
            style={{
              padding: '8px 10px',
              background: B.panel,
              border: `1px solid ${B.line}`,
              borderRadius: 8,
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={{ flex: 1, color: B.ink2 }}>{c.label}</span>
            <code
              style={{
                fontSize: 11,
                background: B.accentSoft,
                color: B.accentInk,
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {c.variable}
            </code>
          </div>
        ))}
      </Field>
      <Field
        label="This block reads"
        hint="Variables referenced by this block's exit conditions."
      >
        {readVars.length === 0 && (
          <div style={{ fontSize: 12, color: B.ink3, fontStyle: 'italic' }}>
            No variables referenced.
          </div>
        )}
        {readVars.map((v) => (
          <div
            key={`${v.scope}.${v.key}`}
            style={{
              padding: '8px 10px',
              background: B.panel,
              border: `1px solid ${B.line}`,
              borderRadius: 8,
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <code
              style={{
                fontSize: 11,
                color: B.ink,
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                flex: 1,
              }}
            >
              {v.scope}.{v.key}
            </code>
            <span style={{ fontSize: 11, color: B.ink3 }}>
              {v.value != null ? String(v.value) : 'not set'}
            </span>
          </div>
        ))}
      </Field>
    </>
  )
}

export default function BInspector({ onClose }: { onClose: () => void }) {
  const { state } = useFlowStore()
  const block = state.selectedId
    ? (state.flow.nodes.find((n) => n.id === state.selectedId) ?? null)
    : null
  const actions = useFlowActions()
  if (!block) return null
  const color = blockColor(block.type, { l: 0.58, c: 0.14 })
  const tabs: Array<{ key: typeof state.activeTab; label: string }> = [
    { key: 'design', label: 'Design' },
    { key: 'routing', label: 'Routing' },
    { key: 'triggers', label: 'Triggers' },
    { key: 'data', label: 'Data' },
  ]
  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        top: 12,
        bottom: 12,
        width: 400,
        background: B.panel,
        borderRadius: 14,
        boxShadow:
          '0 16px 40px rgba(22,21,40,0.12), 0 0 0 1px rgba(22,21,40,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${B.line}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{ width: 6, height: 28, borderRadius: 3, background: color }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              color: B.ink3,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              fontWeight: 600,
            }}
          >
            {BLOCK_BY_TYPE[block.type]?.label}
          </div>
          <input
            value={block.name}
            onChange={(e) =>
              actions.updateBlock(block.id, 'name', e.target.value)
            }
            style={{
              width: '100%',
              fontSize: 15,
              fontWeight: 600,
              color: B.ink,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontFamily: 'inherit',
              padding: 0,
            }}
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            border: 'none',
            background: 'transparent',
            color: B.ink3,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          padding: '6px 4px 0',
          borderBottom: `1px solid ${B.line}`,
          display: 'flex',
          gap: 2,
        }}
      >
        {tabs.map((t) => {
          const isActive = state.activeTab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => actions.setTab(t.key)}
              style={{
                padding: '10px 12px',
                fontSize: 12,
                color: isActive ? B.ink : B.ink3,
                fontWeight: isActive ? 500 : 400,
                borderBottom: `2px solid ${isActive ? B.accent : 'transparent'}`,
                background: 'transparent',
                border: 'none',
                borderRadius: 0,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>
        {state.activeTab === 'design' && <DesignTab block={block} />}
        {state.activeTab === 'routing' && <RoutingTab block={block} />}
        {state.activeTab === 'triggers' && <TriggersTab block={block} />}
        {state.activeTab === 'data' && <DataTab block={block} />}
      </div>
    </div>
  )
}
