'use client'

import type { ReactNode } from 'react'
import { SANS_FAMILY, SERIF_FAMILY } from '../shared-data'
import { useFlowState } from '../store'
import {
  RELEASE_STATUS_INTRO,
  StatusBadge,
  StatusCard,
  StatusNote,
  getDraftWorkspaceStatus,
  getLiveRuntimeStatus,
  getSimulatorStatus,
} from '../surface-status'
import type { Palette } from '../types'
import { isFlowCompileEnabled } from '../directions/b-stage/simulator-overrides'
import RPHeader from './header'

export default function PageVersions({ p }: { p: Palette }) {
  const state = useFlowState()
  const draftStatus = getDraftWorkspaceStatus(state.dirtySincePublish)
  const runtimeStatus = getLiveRuntimeStatus()
  const compileEnabled = isFlowCompileEnabled()
  const simulatorStatus = getSimulatorStatus(compileEnabled)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <RPHeader
        p={p}
        eyebrow={state.flow.name}
        title="Release status"
        description="Compare the team draft with what customers currently get."
        right={
          <StatusBadge
            p={p}
            label={draftStatus.label}
            tone={state.dirtySincePublish ? 'warning' : 'neutral'}
          />
        }
        surfaceLabelKey="dashboard.flows.detail"
      />
      <StatusNote
        p={p}
        label={RELEASE_STATUS_INTRO.label}
        detail={RELEASE_STATUS_INTRO.detail}
        tone="info"
        role="status"
      />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: '24px 32px 56px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatusCard
              p={p}
              eyebrow="Team draft"
              title={draftStatus.label}
              detail={draftStatus.detail}
              tone={state.dirtySincePublish ? 'warning' : 'neutral'}
            >
              <CardMeta p={p}>
                Draft v{state.draftVersion} saved for this team.
              </CardMeta>
            </StatusCard>

            <StatusCard
              p={p}
              eyebrow="Customer replies"
              title={runtimeStatus.label}
              detail={runtimeStatus.detail}
              tone="success"
            >
              <CardMeta p={p}>
                New conversations use the current customer-facing wording.
              </CardMeta>
            </StatusCard>

            <StatusCard
              p={p}
              eyebrow="Prompt reader"
              title="Current customer wording"
              detail="Prompt Reader shows the guidance customers currently get."
              tone="info"
            >
              <CardMeta p={p}>
                {state.flow.id} · {state.flow.channel}
              </CardMeta>
            </StatusCard>

            <StatusCard
              p={p}
              eyebrow="Simulator"
              title={simulatorStatus.label}
              detail={simulatorStatus.detail}
              tone="info"
            >
              <CardMeta p={p}>
                {compileEnabled
                  ? 'Draft changes for the selected step can be previewed here.'
                  : 'Draft changes are ignored in this environment.'}
              </CardMeta>
            </StatusCard>
          </div>

          <InfoSection p={p} title="Recommended workflow today">
            <ol
              style={{
                margin: 0,
                paddingLeft: 18,
                color: p.ink2,
                fontSize: 13.5,
                lineHeight: 1.75,
              }}
            >
              <li>Edit the draft in Flow Builder.</li>
              <li>Preview likely prospect replies in the simulator.</li>
              <li>
                Open Prompt Reader when you need the current customer wording.
              </li>
              <li>
                Use this page as the final truth check before sharing changes.
              </li>
            </ol>
          </InfoSection>

          <InfoSection p={p} title="What marketing can do today">
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                color: p.ink2,
                fontSize: 13.5,
                lineHeight: 1.7,
              }}
            >
              <li>
                Edit step goals, guidance, examples, paths, and saved details.
              </li>
              <li>Inspect current customer wording in Prompt Reader.</li>
              <li>
                Preview replies with the simulator and review the brand inbox.
              </li>
            </ul>
          </InfoSection>

          <InfoSection p={p} title="Coming later">
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                color: p.ink2,
                fontSize: 13.5,
                lineHeight: 1.7,
              }}
            >
              <li>Publishing draft changes from this screen.</li>
              <li>Release history for customer-facing changes.</li>
              <li>Per-flow reporting in the inbox.</li>
            </ul>
          </InfoSection>
        </div>
      </div>
    </div>
  )
}

function InfoSection({
  p,
  title,
  children,
}: {
  p: Palette
  title: string
  children: ReactNode
}) {
  return (
    <section
      style={{
        padding: '20px 22px',
        background: p.panel,
        border: `1px solid ${p.line}`,
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          margin: '0 0 10px',
          fontSize: 20,
          fontWeight: 500,
          color: p.ink,
          fontFamily: p.serif ? SERIF_FAMILY : SANS_FAMILY,
          letterSpacing: -0.25,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function CardMeta({ p, children }: { p: Palette; children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        color: p.ink3,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  )
}
