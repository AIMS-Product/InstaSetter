'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Trash2, X } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import {
  FLOW_BUILDER_LABELS,
  getBlockDisplayLabel,
  type InspectorTabKey,
} from '@/lib/dashboard/flow-builder-labels'
import { blockColor } from '../../shared-data'
import { useFlowActions, useFlowState, useFlowStore } from '../../store'
import type { FlowNode } from '../../types'
import { BlockConfigPanel } from './block-config-panel'
import { ExamplePairs } from './example-pairs'
import { GuardrailsPanel } from './guardrails-panel'
import { B } from './palette'
import { PromptReader } from './prompt-reader'
import { RationaleBanner } from './rationale-banner'
import { FloatingPanel } from './floating-panel'

// Field renders its label with a stable id and exposes it to children via
// render-prop. Children that own the primary editable element (textarea/input)
// can use that id as `aria-labelledby` so the label is announced to screen
// readers — P0.10 fix. Non-accessible children (multi-item rows that have
// their own inline labelling) can still pass a plain ReactNode.
//
// `tooltip` is the operator-facing helper text from
// `FLOW_BUILDER_LABELS.inspectorFields[*].tooltip`. When present, it renders
// as a visually-hidden span. Children apply `aria-describedby={tooltipId}` to
// the actual editable element (input/textarea) so screen readers announce the
// helper text when focus lands on the field, not on the label container.
// Keep tooltips short — they should never crowd the inspector.
function Field({
  label,
  children,
  action,
  hint,
  onAction,
  tooltip,
}: {
  label: string
  children:
    | ReactNode
    | ((labelId: string, tooltipId: string) => ReactNode)
  action?: string
  hint?: string
  onAction?: () => void
  tooltip?: string
}) {
  const labelId = useId()
  const tooltipId = useId()
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
          id={labelId}
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
      {tooltip && (
        <span
          id={tooltipId}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {tooltip}
        </span>
      )}
      {hint && (
        <div style={{ fontSize: 11, color: B.ink3, marginBottom: 6 }}>
          {hint}
        </div>
      )}
      {typeof children === 'function'
        ? children(labelId, tooltipId)
        : children}
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

function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      style={{
        marginBottom: 14,
        background: B.bg,
        border: `1px solid ${B.line}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        style={{
          width: '100%',
          padding: '11px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        {open ? (
          <ChevronDown size={14} color={B.ink3} />
        ) : (
          <ChevronRight size={14} color={B.ink3} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: B.ink,
            }}
          >
            {title}
          </div>
          {summary && (
            <div
              style={{
                fontSize: 11,
                color: B.ink3,
                marginTop: 2,
                lineHeight: 1.4,
              }}
            >
              {summary}
            </div>
          )}
        </div>
      </button>
      {open && (
        <div
          style={{
            padding: '0 12px 12px',
            borderTop: `1px solid ${B.line}`,
            background: B.panel,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function DesignTab({
  block,
  onOpenPrompt,
}: {
  block: FlowNode
  onOpenPrompt: (target?: string) => void
}) {
  const actions = useFlowActions()
  const examplePairCount = block.examplePairs?.length ?? 0
  const draftExampleCount = block.examples.length
  const captureCount = block.captures.length
  const guardrailCount = block.guardrails?.length ?? 0
  const rationaleCount = block.rationale?.length ?? 0
  const whySummary = block.stat
    ? `${block.stat} · ${rationaleCount} supporting insight${
        rationaleCount === 1 ? '' : 's'
      }`
    : `${rationaleCount} supporting insight${rationaleCount === 1 ? '' : 's'}`
  const exampleSummary = [
    `${examplePairCount} parsed pair${examplePairCount === 1 ? '' : 's'}`,
    draftExampleCount > 0
      ? `${draftExampleCount} draft override${draftExampleCount === 1 ? '' : 's'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const runtimeSummary = [
    block.blockConfig ? `${block.blockConfig.kind} settings` : null,
    guardrailCount > 0
      ? `${guardrailCount} guardrail${guardrailCount === 1 ? '' : 's'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <Field
        label={FLOW_BUILDER_LABELS.inspectorFields.goal.display}
        tooltip={FLOW_BUILDER_LABELS.inspectorFields.goal.tooltip}
      >
        {(labelId, tooltipId) => (
          <textarea
            aria-labelledby={labelId}
            {...(FLOW_BUILDER_LABELS.inspectorFields.goal.tooltip
              ? { 'aria-describedby': tooltipId }
              : {})}
            value={block.goal}
            rows={2}
            style={inputStyle}
            onChange={(e) =>
              actions.updateBlock(block.id, 'goal', e.target.value)
            }
          />
        )}
      </Field>
      <Field
        label={FLOW_BUILDER_LABELS.inspectorFields.guidance.display}
        tooltip={FLOW_BUILDER_LABELS.inspectorFields.guidance.tooltip}
        action="↗ View Persona"
        onAction={() => onOpenPrompt('persona')}
        hint="Uses the global voice by default. Add step-specific guidance here."
      >
        {(labelId, tooltipId) => (
          <textarea
            aria-labelledby={labelId}
            {...(FLOW_BUILDER_LABELS.inspectorFields.guidance.tooltip
              ? { 'aria-describedby': tooltipId }
              : {})}
            value={block.guidance}
            rows={3}
            style={inputStyle}
            onChange={(e) =>
              actions.updateBlock(block.id, 'guidance', e.target.value)
            }
          />
        )}
      </Field>
      <CollapsibleSection title="Why this step exists" summary={whySummary}>
        <RationaleBanner rationale={block.rationale ?? []} stat={block.stat} />
      </CollapsibleSection>
      <CollapsibleSection title="Examples" summary={exampleSummary}>
        <Field
          label={`${FLOW_BUILDER_LABELS.inspectorFields.examples.display} · ${examplePairCount}`}
          tooltip={FLOW_BUILDER_LABELS.inspectorFields.examples.tooltip}
          hint="Side-by-side pairs parsed from the source section. Read-only today."
        >
          <ExamplePairs
            pairs={block.examplePairs ?? []}
            emptyHint="This section doesn't include paired counter-examples yet."
          />
        </Field>
        <Field
          label={FLOW_BUILDER_LABELS.inspectorFields.marketerExamples.display}
          tooltip={FLOW_BUILDER_LABELS.inspectorFields.marketerExamples.tooltip}
          action="+ add"
          hint="Draft examples for this step. Saved with the team draft."
          onAction={() => actions.addExample(block.id, 'New example — edit me')}
        >
          {block.examples.length === 0 && (
            <div style={{ fontSize: 12, color: B.ink3, fontStyle: 'italic' }}>
              No draft examples yet. Pairs above come from the current prompt.
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
                aria-label={`Example ${i + 1}`}
                value={ex}
                rows={2}
                onChange={(e) =>
                  actions.editExample(block.id, i, e.target.value)
                }
                style={{
                  ...inputStyle,
                  background: B.lineSoft,
                  padding: '9px 34px 9px 11px',
                  fontSize: 12.5,
                }}
              />
              <IconButton
                icon={X}
                label="Delete example"
                onClick={() => actions.deleteExample(block.id, i)}
                size={22}
                iconSize={13}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: 6,
                  color: B.ink3,
                }}
              />
            </div>
          ))}
        </Field>
      </CollapsibleSection>
      <CollapsibleSection
        title="Data Capture"
        summary={
          captureCount > 0
            ? `${captureCount} capture rule${captureCount === 1 ? '' : 's'}`
            : 'No capture rules yet'
        }
      >
        <Field
          label={FLOW_BUILDER_LABELS.inspectorFields.captures.display}
          tooltip={FLOW_BUILDER_LABELS.inspectorFields.captures.tooltip}
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
              <IconButton
                icon={X}
                label="Delete capture"
                onClick={() => actions.deleteCapture(block.id, c.variable)}
                size={20}
                iconSize={12}
                style={{ color: B.ink3 }}
              />
            </div>
          ))}
        </Field>
      </CollapsibleSection>
      <CollapsibleSection
        title="Runtime Details"
        summary={runtimeSummary || 'Step settings and fixed safety rules'}
      >
        <BlockConfigPanel
          config={block.blockConfig}
          onChange={(config) => actions.updateBlockConfig(block.id, config)}
        />
        <GuardrailsPanel
          guardrails={block.guardrails ?? []}
          onOpenSource={(source) => {
            // Map source file to PromptReader section id.
            const map: Record<string, string> = {
              'src/lib/prompts/sections/persona.ts': 'persona',
              'src/lib/prompts/sections/message-constraints.ts':
                'message-constraints',
              'src/lib/prompts/sections/qualification.ts': 'qualification',
              'src/lib/prompts/sections/objections.ts': 'objections',
              'src/lib/prompts/sections/email-capture.ts': 'email-capture',
              'src/lib/prompts/sections/decision-routing.ts':
                'decision-routing',
              'src/lib/prompts/sections/summary-generation.ts':
                'summary-generation',
              'src/lib/prompts/sections/location-gate.ts': 'location-gate',
              'src/lib/prompts/sections/company-context.ts': 'company-context',
            }
            onOpenPrompt(map[source])
          }}
        />
      </CollapsibleSection>
    </>
  )
}

function RoutingTab({ block }: { block: FlowNode }) {
  const state = useFlowState()
  const actions = useFlowActions()
  const otherNodes = state.flow.nodes.filter((n) => n.id !== block.id)
  const selectedRouteId =
    state.selectedBranch?.fromId === block.id
      ? state.selectedBranch.branchId
      : null
  const routeRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (!selectedRouteId) return
    routeRefs.current[selectedRouteId]?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [selectedRouteId])

  return (
    <Field
      label={FLOW_BUILDER_LABELS.inspectorFields.routesOut.display}
      tooltip={FLOW_BUILDER_LABELS.inspectorFields.routesOut.tooltip}
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
          {FLOW_BUILDER_LABELS.inspectorFields.routesOutEmpty.display}
        </div>
      )}
      {block.branches.map((br) => {
        const tgt = state.flow.nodes.find((n) => n.id === br.target)
        const selected = selectedRouteId === br.id
        return (
          <div
            key={br.id}
            ref={(el) => {
              routeRefs.current[br.id] = el
            }}
            style={{
              padding: '10px 11px',
              background: selected ? B.accentSoft : B.panel,
              border: `1px solid ${selected ? B.accent : B.line}`,
              borderRadius: 8,
              marginBottom: 8,
              boxShadow: selected ? '0 0 0 2px rgba(79,70,186,0.08)' : 'none',
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
                aria-label="Route label"
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
              <IconButton
                icon={X}
                label="Delete route"
                onClick={() => actions.deleteBranch(block.id, br.id)}
                size={24}
                iconSize={13}
                style={{ color: selected ? B.accentInk : B.ink3 }}
              />
            </div>
            {selected && (
              <div
                style={{
                  fontSize: 11,
                  color: B.accentInk,
                  fontWeight: 600,
                  margin: '-2px 0 8px',
                }}
              >
                Selected from canvas
              </div>
            )}
            <div style={{ fontSize: 11.5, color: B.ink3, marginBottom: 4 }}>
              When
            </div>
            <textarea
              aria-label="Route condition"
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
                aria-label="Next step"
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

function DeleteBlockPanel({ block }: { block: FlowNode }) {
  const state = useFlowState()
  const actions = useFlowActions()
  const [confirming, setConfirming] = useState(false)
  const canDelete = state.flow.nodes.length > 1

  return (
    <div
      style={{
        marginTop: 18,
        paddingTop: 16,
        borderTop: `1px solid ${B.line}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: B.ink3,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        {FLOW_BUILDER_LABELS.panelSections.stepActions.display}
      </div>
      <button
        type="button"
        disabled={!canDelete}
        onClick={() => {
          if (!confirming) {
            setConfirming(true)
            return
          }
          actions.deleteNode(block.id)
        }}
        style={{
          width: '100%',
          minHeight: 38,
          borderRadius: 8,
          border: `1px solid ${confirming ? '#DCAAAA' : B.line}`,
          background: confirming ? '#FBEFEF' : B.panel,
          color: canDelete ? '#8E2A2A' : B.ink3,
          cursor: canDelete ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          fontSize: 12.5,
          fontWeight: 650,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: canDelete ? 1 : 0.55,
        }}
      >
        <Trash2 aria-hidden size={14} strokeWidth={1.8} />
        {confirming ? `Confirm delete ${block.name}` : 'Delete step'}
      </button>
    </div>
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
      label={FLOW_BUILDER_LABELS.inspectorFields.triggers.display}
      tooltip={FLOW_BUILDER_LABELS.inspectorFields.triggers.tooltip}
      hint="Send later after this step starts. Respect Meta's 24-hour messaging window."
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
          {FLOW_BUILDER_LABELS.inspectorFields.triggersEmpty.display}
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
              aria-label="Trigger name"
              value={t.name}
              onChange={(e) =>
                actions.editTrigger(t.id, { name: e.target.value })
              }
              style={{ ...smallInputStyle, flex: 1, fontWeight: 500 }}
            />
            <IconButton
              icon={X}
              label="Delete trigger"
              onClick={() => actions.deleteTrigger(t.id)}
              size={24}
              iconSize={13}
              style={{ color: B.ink3 }}
            />
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
              aria-label="Trigger delay in minutes"
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
              aria-label="Trigger delivery mode"
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
              aria-label="Follow-up target step"
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
      <Field label={FLOW_BUILDER_LABELS.inspectorFields.memorySaves.display}>
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
        label={FLOW_BUILDER_LABELS.inspectorFields.memoryReads.display}
        tooltip={FLOW_BUILDER_LABELS.inspectorFields.memoryReads.tooltip}
        hint="Saved details used by this step's path rules."
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
  const [reader, setReader] = useState<{ target?: string } | null>(null)
  if (!block) return null
  const color = blockColor(block.type, { l: 0.58, c: 0.14 })
  const tabs: Array<{ key: InspectorTabKey; label: string }> = [
    {
      key: 'design',
      label: FLOW_BUILDER_LABELS.inspectorTabs.design.display,
    },
    {
      key: 'routing',
      label: FLOW_BUILDER_LABELS.inspectorTabs.routing.display,
    },
    {
      key: 'triggers',
      label: FLOW_BUILDER_LABELS.inspectorTabs.triggers.display,
    },
    {
      key: 'data',
      label: FLOW_BUILDER_LABELS.inspectorTabs.data.display,
    },
  ]
  const titleId = 'flow-inspector-title'
  return (
    <FloatingPanel
      open
      titleId={titleId}
      onClose={onClose}
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
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{getBlockDisplayLabel(block.type)}</span>
            {state.simActiveBlock === block.id &&
              state.conversation.length > 0 && (
                <span
                  aria-label="Currently replying as this step"
                  title="Currently replying as this step"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 6px',
                    borderRadius: 999,
                    background: B.accentSoft,
                    color: B.accentInk,
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: 0.4,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: color,
                    }}
                  />
                  Active
                </span>
              )}
          </div>
          <input
            id={titleId}
            aria-label="Step name"
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
          onClick={() => setReader({})}
          title="View the customer-facing wording for this step"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 28,
            padding: '0 10px',
            borderRadius: 7,
            border: `1px solid ${B.line}`,
            background: B.panel,
            color: B.ink2,
            cursor: 'pointer',
            fontSize: 11.5,
            fontWeight: 500,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: color,
              opacity: 0.85,
            }}
          />
          View prompt
        </button>
        <IconButton
          icon={X}
          label="Close inspector"
          onClick={onClose}
          size={28}
          iconSize={15}
          style={{ color: B.ink3 }}
        />
      </div>

      <div
        role="tablist"
        aria-label="Step settings sections"
        onKeyDown={(e) => {
          const i = tabs.findIndex((x) => x.key === state.activeTab)
          if (i < 0) return
          const move = (delta: number) => {
            e.preventDefault()
            const next = (i + delta + tabs.length) % tabs.length
            const key = tabs[next]!.key
            actions.setTab(key)
            const el = document.getElementById(`inspector-tab-${key}`)
            el?.focus()
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(1)
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(-1)
          else if (e.key === 'Home') {
            e.preventDefault()
            actions.setTab(tabs[0]!.key)
            document.getElementById(`inspector-tab-${tabs[0]!.key}`)?.focus()
          } else if (e.key === 'End') {
            e.preventDefault()
            const last = tabs[tabs.length - 1]!.key
            actions.setTab(last)
            document.getElementById(`inspector-tab-${last}`)?.focus()
          }
        }}
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
              role="tab"
              id={`inspector-tab-${t.key}`}
              aria-controls={`inspector-panel-${t.key}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
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

      <div
        role="tabpanel"
        id={`inspector-panel-${state.activeTab}`}
        aria-labelledby={`inspector-tab-${state.activeTab}`}
        style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}
      >
        {state.activeTab === 'design' && (
          <DesignTab
            block={block}
            onOpenPrompt={(target) => setReader({ target })}
          />
        )}
        {state.activeTab === 'routing' && <RoutingTab block={block} />}
        {state.activeTab === 'triggers' && <TriggersTab block={block} />}
        {state.activeTab === 'data' && <DataTab block={block} />}
        <DeleteBlockPanel key={block.id} block={block} />
      </div>
      {reader && (
        <PromptReader
          block={block}
          brand={state.flow.brand}
          initialTarget={reader.target}
          onClose={() => setReader(null)}
        />
      )}
    </FloatingPanel>
  )
}
