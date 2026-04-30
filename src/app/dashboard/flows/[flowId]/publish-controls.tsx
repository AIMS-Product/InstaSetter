'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  listFlowVersionsAction,
  publishFlowAction,
  rollbackFlowAction,
} from './actions'
import { useFlowState } from './store'
import { B } from './directions/b-stage/palette'
import type { FlowVersionListItem } from '@/lib/services/published-flows'

type DialogMode = null | 'publish' | 'history'

/**
 * Publish + History controls for the Flow Builder. Sits in the header so it
 * is reachable from every editor surface. Wraps the three Server Actions
 * (publishFlowAction, rollbackFlowAction, listFlowVersionsAction) and renders
 * a confirm dialog before either destructive action.
 */
export default function PublishControls({
  brand,
  flowId,
}: {
  brand: string
  flowId: string
}) {
  const state = useFlowState()
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [versions, setVersions] = useState<FlowVersionListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState('')

  // Load versions on first open of either dialog so the operator sees the
  // current state without scrolling away.
  useEffect(() => {
    if (dialog == null) return
    let cancelled = false
    listFlowVersionsAction({ brand, flowId }).then((result) => {
      if (!cancelled) setVersions(result.versions)
    })
    return () => {
      cancelled = true
    }
  }, [brand, flowId, dialog, state.draftVersion, state.publishedVersion])

  const activeVersion = versions.find((v) => v.isActive)
  const latestActive =
    activeVersion?.versionNumber ?? state.publishedVersion ?? 0

  const handlePublish = () => {
    setError(null)
    const trimmedNote = note.trim()
    startTransition(async () => {
      const result = await publishFlowAction({
        brand,
        flowId,
        note: trimmedNote || undefined,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      const refreshed = await listFlowVersionsAction({ brand, flowId })
      setVersions(refreshed.versions)
      setDialog(null)
      setNote('')
    })
  }

  const handleRollback = (versionId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await rollbackFlowAction({
        brand,
        flowId,
        versionId,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      const refreshed = await listFlowVersionsAction({ brand, flowId })
      setVersions(refreshed.versions)
    })
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => setDialog('publish')}
          aria-label="Publish flow draft"
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: `1px solid ${B.accent}`,
            background: B.accent,
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 650,
            cursor: 'pointer',
          }}
        >
          Publish
        </button>
        <button
          type="button"
          onClick={() => setDialog('history')}
          aria-label="Open version history"
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: `1px solid ${B.line}`,
            background: B.lineSoft,
            color: B.ink,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          History
        </button>
        {latestActive > 0 && (
          <span
            style={{ fontSize: 11, color: B.ink3, fontWeight: 600 }}
            data-testid="published-version-label"
          >
            Published v{latestActive}
          </span>
        )}
      </div>
      {dialog === 'publish' && (
        <ConfirmDialog
          title="Publish draft?"
          description="This will affect new conversations starting from now. In-flight conversations stay on the version they started with."
          onConfirm={handlePublish}
          onCancel={() => {
            setDialog(null)
            setNote('')
            setError(null)
          }}
          confirmLabel={pending ? 'Publishing…' : 'Publish'}
          confirmDisabled={pending}
          error={error}
        >
          <label
            htmlFor="publish-note"
            style={{
              fontSize: 12,
              color: B.ink2,
              display: 'block',
              marginBottom: 6,
            }}
          >
            Notes (optional)
          </label>
          <textarea
            id="publish-note"
            placeholder="What changed?"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            style={{
              width: '100%',
              minHeight: 64,
              borderRadius: 8,
              border: `1px solid ${B.line}`,
              padding: 8,
              fontSize: 13,
              color: B.ink,
              fontFamily: 'inherit',
            }}
          />
        </ConfirmDialog>
      )}
      {dialog === 'history' && (
        <HistoryDialog
          versions={versions}
          onClose={() => {
            setDialog(null)
            setError(null)
          }}
          onRollback={handleRollback}
          pending={pending}
          error={error}
        />
      )}
    </>
  )
}

function ConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel,
  confirmDisabled,
  error,
  children,
}: {
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel: string
  confirmDisabled?: boolean
  error?: string | null
  children?: React.ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(22,21,40,0.42)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: '94vw',
          padding: 22,
          borderRadius: 14,
          background: B.panel,
          color: B.ink,
          boxShadow: '0 28px 60px rgba(22,21,40,0.24)',
          display: 'grid',
          gap: 14,
        }}
      >
        <h2
          id="publish-dialog-title"
          style={{ margin: 0, fontSize: 17, fontWeight: 650 }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: 0,
            color: B.ink2,
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {description}
        </p>
        {children}
        {error && (
          <p
            role="alert"
            style={{
              margin: 0,
              color: '#8B231F',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {error}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: `1px solid ${B.line}`,
              background: B.lineSoft,
              color: B.ink,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: `1px solid ${B.accent}`,
              background: confirmDisabled ? B.lineSoft : B.accent,
              color: confirmDisabled ? B.ink3 : '#fff',
              fontSize: 12.5,
              fontWeight: 650,
              cursor: confirmDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryDialog({
  versions,
  onClose,
  onRollback,
  pending,
  error,
}: {
  versions: FlowVersionListItem[]
  onClose: () => void
  onRollback: (versionId: string) => void
  pending: boolean
  error: string | null
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(22,21,40,0.42)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: 520,
          maxWidth: '96vw',
          maxHeight: '80vh',
          padding: 22,
          borderRadius: 14,
          background: B.panel,
          color: B.ink,
          boxShadow: '0 28px 60px rgba(22,21,40,0.24)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            id="history-dialog-title"
            style={{ margin: 0, fontSize: 17, fontWeight: 650 }}
          >
            Version history
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            style={{
              border: 'none',
              background: 'transparent',
              color: B.ink2,
              fontSize: 18,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        {versions.length === 0 ? (
          <p
            style={{
              margin: 0,
              color: B.ink2,
              fontSize: 13,
            }}
          >
            No published versions yet.
          </p>
        ) : (
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'grid',
              gap: 10,
              overflowY: 'auto',
            }}
          >
            {versions.map((version) => (
              <li
                key={version.versionId}
                data-testid="version-row"
                style={{
                  border: `1px solid ${B.line}`,
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: version.isActive ? B.accentSoft : B.panel,
                }}
              >
                <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 650,
                      color: B.ink,
                    }}
                  >
                    v{version.versionNumber}
                    {version.isActive && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          color: B.accentInk,
                          background: '#fff',
                          border: `1px solid ${B.accent}`,
                          borderRadius: 999,
                          padding: '2px 8px',
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: B.ink2,
                    }}
                  >
                    {new Date(version.publishedAt).toLocaleString()}
                    {version.publishedBy ? ` · ${version.publishedBy}` : ''}
                  </div>
                  {version.note && (
                    <div
                      style={{
                        fontSize: 12,
                        color: B.ink3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {version.note}
                    </div>
                  )}
                </div>
                {!version.isActive && (
                  <button
                    type="button"
                    onClick={() => onRollback(version.versionId)}
                    disabled={pending}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${B.line}`,
                      background: B.lineSoft,
                      color: B.ink,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: pending ? 'wait' : 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Rollback to v{version.versionNumber}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p
            role="alert"
            style={{
              margin: 0,
              color: '#8B231F',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
