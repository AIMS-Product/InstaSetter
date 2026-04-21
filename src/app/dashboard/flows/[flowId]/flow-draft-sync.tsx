'use client'

import { useEffect, useRef } from 'react'
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
  const draft = extractPersistedFlowDraft(state)
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

    async function bootstrap() {
      try {
        const remote = await loadFlowDraftAction({ brand, flowId, bookingUrl })
        if (!alive) return

        if (remote) {
          lastSavedJsonRef.current = JSON.stringify(remote)
          actions.hydrate(remote)
          clearLegacyLocalFlowDraft({ brand, flowId })
          bootReadyRef.current = true
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
          } else {
            actions.toast('Could not sync this draft to Supabase yet.')
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
    }

    void bootstrap()

    return () => {
      alive = false
    }
  }, [actions, brand, bookingUrl, flowId])

  useEffect(() => {
    if (!bootReadyRef.current) return
    if (serializedDraft === lastSavedJsonRef.current) return

    const timer = window.setTimeout(() => {
      void saveFlowDraftAction({
        brand,
        flowId,
        bookingUrl,
        state: draft,
      })
        .then((saved) => {
          if (!saved) {
            if (!saveErrorShownRef.current) {
              actions.toast('Could not sync this draft to Supabase yet.')
              saveErrorShownRef.current = true
            }
            return
          }

          lastSavedJsonRef.current = serializedDraft
          saveErrorShownRef.current = false
        })
        .catch((error) => {
          console.error('Flow draft save failed', error)
          if (!saveErrorShownRef.current) {
            actions.toast('Could not sync this draft to Supabase yet.')
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
