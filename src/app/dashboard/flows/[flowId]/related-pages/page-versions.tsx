'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { isFlowVersionsEnabled } from '@/lib/config'
import { ConfirmHighImpactModal } from '@/components/ui/confirm-high-impact-modal'
import {
  listFlowDraftVersionsAction,
  restoreFlowDraftVersionAction,
} from '../actions'
import { SANS_FAMILY, SERIF_FAMILY } from '../shared-data'
import { useFlowActions, useFlowState } from '../store'
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

interface VersionRowSummary {
  versionNumber: number
  reason: string | null
  createdBy: string | null
  createdAt: string
}

export default function PageVersions({
  p,
  brand,
  flowId,
  actorEmail = null,
}: {
  p: Palette
  brand?: string
  flowId?: string
  actorEmail?: string | null
}) {
  const state = useFlowState()
  const actions = useFlowActions()
  const draftStatus = getDraftWorkspaceStatus(state.dirtySincePublish)
  const runtimeStatus = getLiveRuntimeStatus()
  const compileEnabled = isFlowCompileEnabled()
  const simulatorStatus = getSimulatorStatus(compileEnabled)
  const versionsEnabled = isFlowVersionsEnabled()

  const resolvedBrand = brand ?? state.flow.brand
  const resolvedFlowId = flowId ?? state.flow.id

  const [versions, setVersions] = useState<VersionRowSummary[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    versionsEnabled ? 'loading' : 'idle'
  )
  const [error, setError] = useState<string | null>(null)
  const [pendingRestore, setPendingRestore] = useState<number | null>(null)

  const loadVersions = useCallback(() => {
    if (!versionsEnabled) return
    void listFlowDraftVersionsAction({
      brand: resolvedBrand,
      flowId: resolvedFlowId,
    }).then((result) => {
      if (!result.success) {
        setError(result.error)
        setStatus('error')
        return
      }
      setVersions(
        result.data.map((row) => ({
          versionNumber: row.versionNumber,
          reason: row.reason,
          createdBy: row.createdBy,
          createdAt: row.createdAt,
        }))
      )
      setError(null)
      setStatus('ready')
    })
  }, [resolvedBrand, resolvedFlowId, versionsEnabled])

  useEffect(() => {
    if (!versionsEnabled) return
    loadVersions()
  }, [loadVersions, versionsEnabled])

  const handleRestore = useCallback(
    async (reason: string) => {
      if (pendingRestore === null) return
      const result = await restoreFlowDraftVersionAction({
        brand: resolvedBrand,
        flowId: resolvedFlowId,
        versionNumber: pendingRestore,
        reason: reason || undefined,
        actorEmail,
      })
      if (!result.success) {
        actions.toast(result.error)
        return
      }
      actions.hydrate(result.data.restored)
      actions.toast(`Restored draft to v${pendingRestore}`)
      setPendingRestore(null)
      loadVersions()
    },
    [
      actions,
      actorEmail,
      loadVersions,
      pendingRestore,
      resolvedBrand,
      resolvedFlowId,
    ]
  )

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

          {versionsEnabled && (
            <InfoSection p={p} title="Saved versions">
              {status === 'loading' && (
                <p style={{ color: p.ink3, fontSize: 13 }}>
                  Loading saved versions…
                </p>
              )}
              {status === 'error' && error && (
                <p style={{ color: '#8E2A2A', fontSize: 13 }}>{error}</p>
              )}
              {status === 'ready' && versions.length === 0 && (
                <p style={{ color: p.ink3, fontSize: 13 }}>
                  No saved versions yet. The first high-impact save will create
                  one.
                </p>
              )}
              {versions.length > 0 && (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                    color: p.ink2,
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={cellHeaderStyle}>Version</th>
                      <th style={cellHeaderStyle}>Saved by</th>
                      <th style={cellHeaderStyle}>Reason</th>
                      <th style={cellHeaderStyle}>When</th>
                      <th style={{ ...cellHeaderStyle, textAlign: 'right' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((row) => (
                      <tr
                        key={row.versionNumber}
                        style={{ borderTop: `1px solid ${p.line}` }}
                      >
                        <td style={cellStyle}>v{row.versionNumber}</td>
                        <td style={cellStyle}>{row.createdBy ?? 'system'}</td>
                        <td style={cellStyle}>
                          {row.reason ?? (
                            <span style={{ color: p.ink3 }}>(no reason)</span>
                          )}
                        </td>
                        <td style={cellStyle}>
                          {formatTimestamp(row.createdAt)}
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setPendingRestore(row.versionNumber)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: `1px solid ${p.line}`,
                              background: '#FFFFFF',
                              color: p.ink,
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </InfoSection>
          )}

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

      <ConfirmHighImpactModal
        open={pendingRestore !== null}
        mode="restore"
        onConfirm={handleRestore}
        onDiscard={() => setPendingRestore(null)}
      />
    </div>
  )
}

const cellHeaderStyle = {
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  color: '#6B6A7E',
  letterSpacing: 0.4,
}

const cellStyle = {
  padding: '10px 12px',
  fontSize: 13,
  lineHeight: 1.5,
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString()
  } catch {
    return iso
  }
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
