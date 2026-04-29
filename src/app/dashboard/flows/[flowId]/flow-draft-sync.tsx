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
  const actionsRef = useRef(actions)
  const draftRef = useRef<ReturnType<typeof extractPersistedFlowDraft> | null>(
    null
  )
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
    actionsRef.current = actions
  }, [actions])

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    let alive = true
    const seedDraft = extractPersistedFlowDraft(
      buildInitialState(brand, bookingUrl, flowId)
    )
    const seedDraftJson = JSON.stringify(seedDraft)

    bootReadyRef.current = false
    lastSavedJsonRef.current = null
    saveErrorShownRef.current = false
    actionsRef.current.setDraftSyncStatus('loading')

    async function bootstrap() {
      try {
        const remote = await loadFlowDraftAction({ brand, flowId, bookingUrl })
        if (!alive) return

        if (remote) {
          lastSavedJsonRef.current = JSON.stringify(remote)
          actionsRef.current.hydrate(remote)
          clearLegacyLocalFlowDraft({ brand, flowId })
          bootReadyRef.current = true
          actionsRef.current.setDraftSyncStatus('saved')
          return
        }

        const local = loadLegacyLocalFlowDraft({ brand, flowId, bookingUrl })
        if (!alive) return

        if (local) {
          const localJson = JSON.stringify(local)
          lastSavedJsonRef.current = localJson
          actionsRef.current.hydrate(local)

          const saved = await saveFlowDraftAction({
            brand,
            flowId,
            bookingUrl,
            state: local,
          })

          if (!alive) return

          if (saved) {
            clearLegacyLocalFlowDraft({ brand, flowId })
            actionsRef.current.setDraftSyncStatus('saved')
          } else {
            actionsRef.current.toast(
              'Could not save this draft yet — we will retry.'
            )
            actionsRef.current.setDraftSyncStatus('error')
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
      actionsRef.current.setDraftSyncStatus('saved')
    }

    void bootstrap()

    return () => {
      alive = false
    }
  }, [brand, bookingUrl, flowId])

  useEffect(() => {
    if (!bootReadyRef.current) return
    if (serializedDraft === lastSavedJsonRef.current) return
    const draftToSave = draftRef.current
    if (!draftToSave) return
    actionsRef.current.setDraftSyncStatus('pending')

    const timer = window.setTimeout(() => {
      actionsRef.current.setDraftSyncStatus('saving')
      void saveFlowDraftAction({
        brand,
        flowId,
        bookingUrl,
        state: draftToSave,
      })
        .then((saved) => {
          if (!saved) {
            if (!saveErrorShownRef.current) {
              actionsRef.current.toast(
                'Could not save this draft yet — we will retry.'
              )
              saveErrorShownRef.current = true
            }
            actionsRef.current.setDraftSyncStatus('error')
            return
          }

          lastSavedJsonRef.current = serializedDraft
          saveErrorShownRef.current = false
          actionsRef.current.setDraftSyncStatus('saved')
        })
        .catch((error) => {
          console.error('Flow draft save failed', error)
          actionsRef.current.setDraftSyncStatus('error')
          if (!saveErrorShownRef.current) {
            actionsRef.current.toast(
              'Could not save this draft yet — we will retry.'
            )
            saveErrorShownRef.current = true
          }
        })
    }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [bookingUrl, brand, flowId, serializedDraft])

  return null
}
