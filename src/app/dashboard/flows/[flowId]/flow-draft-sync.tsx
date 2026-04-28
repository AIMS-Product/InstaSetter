'use client'

import { useEffect, useMemo, useRef } from 'react'
import { loadFlowDraftAction, saveFlowDraftAction } from './actions'
import { extractPersistedFlowDraft } from './draft-persistence'
import {
  clearLegacyLocalFlowDraft,
  loadLegacyLocalFlowDraft,
} from './legacy-local-draft'
import { buildInitialState, useFlowActions, useFlowState } from './store'

export default function FlowDraftSync({
  brand,
  flowId,
  bookingUrl,
}: {
  brand: string
  flowId: string
  bookingUrl?: string
}) {
  const state = useFlowState()
  const actions = useFlowActions()
  const bootReadyRef = useRef(false)
  const lastSavedJsonRef = useRef<string | null>(null)
  const saveErrorShownRef = useRef(false)
  const draft = useMemo(
    () =>
      extractPersistedFlowDraft({
        flow: state.flow,
        triggers: state.triggers,
        bot: state.bot,
        variables: state.variables,
        versions: state.versions,
        publishedVersion: state.publishedVersion,
        draftVersion: state.draftVersion,
        dirtySincePublish: state.dirtySincePublish,
      }),
    [
      state.bot,
      state.dirtySincePublish,
      state.draftVersion,
      state.flow,
      state.publishedVersion,
      state.triggers,
      state.variables,
      state.versions,
    ]
  )
  const serializedDraft = JSON.stringify(draft)

  useEffect(() => {
    let alive = true
    const seedDraft = extractPersistedFlowDraft(
      buildInitialState(brand, bookingUrl, flowId)
    )
    const seedDraftJson = JSON.stringify(seedDraft)

    bootReadyRef.current = false
    lastSavedJsonRef.current = null
    saveErrorShownRef.current = false
    actions.setDraftSyncStatus('loading')

    async function bootstrap() {
      try {
        const remote = await loadFlowDraftAction({ brand, flowId, bookingUrl })
        if (!alive) return

        if (remote) {
          lastSavedJsonRef.current = JSON.stringify(remote)
          actions.hydrate(remote)
          clearLegacyLocalFlowDraft({ brand, flowId })
          bootReadyRef.current = true
          actions.setDraftSyncStatus('saved')
          return
        }

        const local = loadLegacyLocalFlowDraft({ brand, flowId, bookingUrl })
        if (!alive) return

        if (local) {
          const localJson = JSON.stringify(local)
          lastSavedJsonRef.current = localJson
          actions.hydrate(local)

          const saved = await saveFlowDraftAction({
            brand,
            flowId,
            bookingUrl,
            state: local,
          })

          if (!alive) return

          if (saved) {
            clearLegacyLocalFlowDraft({ brand, flowId })
            actions.setDraftSyncStatus('saved')
          } else {
            actions.toast('Could not save this draft yet — we will retry.')
            actions.setDraftSyncStatus('error')
            saveErrorShownRef.current = true
          }

          bootReadyRef.current = true
          return
        }
      } catch (error) {
        console.error('Flow draft bootstrap failed', error)
      }

      if (!alive) return
      lastSavedJsonRef.current = seedDraftJson
      bootReadyRef.current = true
      actions.setDraftSyncStatus('saved')
    }

    void bootstrap()

    return () => {
      alive = false
    }
  }, [actions, brand, bookingUrl, flowId])

  useEffect(() => {
    if (!bootReadyRef.current) return
    if (serializedDraft === lastSavedJsonRef.current) return
    actions.setDraftSyncStatus('pending')

    const timer = window.setTimeout(() => {
      actions.setDraftSyncStatus('saving')
      void saveFlowDraftAction({
        brand,
        flowId,
        bookingUrl,
        state: draft,
      })
        .then((saved) => {
          if (!saved) {
            if (!saveErrorShownRef.current) {
              actions.toast('Could not save this draft yet — we will retry.')
              saveErrorShownRef.current = true
            }
            actions.setDraftSyncStatus('error')
            return
          }

          lastSavedJsonRef.current = serializedDraft
          saveErrorShownRef.current = false
          actions.setDraftSyncStatus('saved')
        })
        .catch((error) => {
          console.error('Flow draft save failed', error)
          actions.setDraftSyncStatus('error')
          if (!saveErrorShownRef.current) {
            actions.toast('Could not save this draft yet — we will retry.')
            saveErrorShownRef.current = true
          }
        })
    }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [actions, bookingUrl, brand, draft, flowId, serializedDraft])

  return null
}
