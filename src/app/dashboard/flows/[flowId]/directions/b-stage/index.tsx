'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PageNav from '../../page-nav'
import PageBot from '../../related-pages/page-bot'
import PageVariables from '../../related-pages/page-variables'
import FlowDraftSync from '../../flow-draft-sync'
import {
  FlowStoreProvider,
  useFlowActions,
  useFlowState,
  useFlowStore,
  type FlowToast,
} from '../../store'
import type { PageId } from '../../types'
import BHeader from './header'
import BCanvas from './canvas'
import BInspector from './inspector'
import BSimFloat from './sim-float'
import PaletteDrawer from './palette-drawer'
import { B } from './palette'
import { buildSimulatorOverrides } from './simulator-overrides'

function Shell({
  flowId,
  brand,
  bookingUrl,
  botEnabled,
}: {
  flowId: string
  brand: string
  bookingUrl: string
  botEnabled: boolean
}) {
  const state = useFlowState()
  const actions = useFlowActions()
  const { selectedBlock } = useFlowStore()
  const [page, setPage] = useState<PageId>('flow')
  const [simOpen, setSimOpen] = useState(false)

  const overrides = useMemo(
    () =>
      buildSimulatorOverrides({
        selectedBlock,
        brand,
        bookingUrl,
        triggers: state.triggers,
        brandGuardrails: state.bot.brandGuardrails ?? [],
      }),
    [
      bookingUrl,
      brand,
      selectedBlock,
      state.triggers,
      state.bot.brandGuardrails,
    ]
  )

  const dismissToast = useCallback(() => actions.toast(null), [actions])
  const undoDelete = useCallback(() => actions.undoLastDelete(), [actions])

  return (
    <main
      id="main"
      tabIndex={-1}
      aria-label="Flow builder"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: B.bg,
        color: B.ink,
      }}
    >
      <BHeader
        flowId={flowId}
        page={page}
        simOpen={simOpen}
        onToggleSim={() => setSimOpen((s) => !s)}
        botEnabled={botEnabled}
      />
      <div
        style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}
      >
        <PageNav p={B} page={page} onChange={setPage} />
        {page === 'flow' && (
          <div
            role="tabpanel"
            id="flow-builder-panel-flow"
            aria-labelledby="flow-builder-tab-flow"
            style={{
              flex: 1,
              display: 'flex',
              minWidth: 0,
              position: 'relative',
            }}
          >
            <BCanvas />
            <PaletteDrawer />
            <BInspector onClose={() => actions.select(null)} />
            <BSimFloat
              open={simOpen}
              onClose={() => setSimOpen(false)}
              overrides={overrides}
            />
          </div>
        )}
        {page === 'variables' && (
          <div
            role="tabpanel"
            id="flow-builder-panel-variables"
            aria-labelledby="flow-builder-tab-variables"
            style={{ flex: 1, minWidth: 0 }}
          >
            <PageVariables p={B} />
          </div>
        )}
        {page === 'bot' && (
          <div
            role="tabpanel"
            id="flow-builder-panel-bot"
            aria-labelledby="flow-builder-tab-bot"
            style={{ flex: 1, minWidth: 0 }}
          >
            <PageBot p={B} />
          </div>
        )}
      </div>
      {state.toast && (
        <Toast toast={state.toast} onDone={dismissToast} onUndo={undoDelete} />
      )}
    </main>
  )
}

function Toast({
  toast,
  onDone,
  onUndo,
}: {
  toast: FlowToast
  onDone: () => void
  onUndo: () => void
}) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(onDone, toast.action ? 6000 : 2400)
    return () => window.clearTimeout(timer)
  }, [paused, toast.action, toast.message, onDone])

  return (
    <div
      role="status"
      aria-live="polite"
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPaused(false)
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onDone()
      }}
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 16px',
        borderRadius: 10,
        background: B.ink,
        color: B.panel,
        fontSize: 12.5,
        fontWeight: 500,
        boxShadow: '0 10px 28px rgba(22,21,40,0.22)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span>{toast.message}</span>
      {toast.action === 'undo-delete' && (
        <button
          type="button"
          onClick={onUndo}
          style={{
            border: `1px solid rgba(255,255,255,0.28)`,
            borderRadius: 7,
            background: 'rgba(255,255,255,0.12)',
            color: B.panel,
            cursor: 'pointer',
            font: 'inherit',
            fontSize: 12,
            fontWeight: 650,
            padding: '5px 9px',
          }}
        >
          {toast.actionLabel ?? 'Undo'}
        </button>
      )}
    </div>
  )
}

export default function DirectionB({
  flowId,
  brand,
  bookingUrl,
  botEnabled,
}: {
  flowId: string
  brand: string
  bookingUrl: string
  botEnabled: boolean
}) {
  return (
    <FlowStoreProvider
      key={`${brand}:${flowId}:${bookingUrl}`}
      flowId={flowId}
      brand={brand}
      bookingUrl={bookingUrl}
    >
      <FlowDraftSync flowId={flowId} brand={brand} bookingUrl={bookingUrl} />
      <Shell
        flowId={flowId}
        brand={brand}
        bookingUrl={bookingUrl}
        botEnabled={botEnabled}
      />
    </FlowStoreProvider>
  )
}
