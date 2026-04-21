'use client'

import { useEffect, useMemo, useState } from 'react'
import PageNav from '../../page-nav'
import PageBot from '../../related-pages/page-bot'
import PageRuns from '../../related-pages/page-runs'
import PageVariables from '../../related-pages/page-variables'
import PageVersions from '../../related-pages/page-versions'
import {
  FlowStoreProvider,
  useFlowActions,
  useFlowState,
  useFlowStore,
} from '../../store'
import type { PageId } from '../../types'
import BHeader from './header'
import BCanvas from './canvas'
import BInspector from './inspector'
import BSimFloat from './sim-float'
import PaletteDrawer from './palette-drawer'
import { B } from './palette'
import { buildSimulatorOverrides } from './simulator-overrides'

function Shell({ brand, bookingUrl }: { brand: string; bookingUrl: string }) {
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
      }),
    [bookingUrl, brand, selectedBlock, state.triggers]
  )

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
        page={page}
        simOpen={simOpen}
        onToggleSim={() => setSimOpen((s) => !s)}
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
        {page === 'runs' && (
          <div
            role="tabpanel"
            id="flow-builder-panel-runs"
            aria-labelledby="flow-builder-tab-runs"
            style={{ flex: 1, minWidth: 0 }}
          >
            <PageRuns p={B} />
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
        {page === 'versions' && (
          <div
            role="tabpanel"
            id="flow-builder-panel-versions"
            aria-labelledby="flow-builder-tab-versions"
            style={{ flex: 1, minWidth: 0 }}
          >
            <PageVersions p={B} />
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
        <Toast msg={state.toast} onDone={() => actions.toast(null)} />
      )}
    </main>
  )
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2400)
    return () => window.clearTimeout(timer)
  }, [msg, onDone])

  return (
    <div
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
      }}
    >
      {msg}
    </div>
  )
}

export default function DirectionB({
  flowId,
  brand,
  bookingUrl,
}: {
  flowId: string
  brand: string
  bookingUrl: string
}) {
  return (
    <FlowStoreProvider
      key={`${brand}:${flowId}:${bookingUrl}`}
      flowId={flowId}
      brand={brand}
      bookingUrl={bookingUrl}
    >
      <Shell brand={brand} bookingUrl={bookingUrl} />
    </FlowStoreProvider>
  )
}
