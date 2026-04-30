'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isFlowVersionsEnabled } from '@/lib/config'
import { isFieldPathHighImpact } from '@/lib/dashboard/flow-builder-locks'
import { ConfirmHighImpactModal } from '@/components/ui/confirm-high-impact-modal'
import {
  createFlowDraftVersionAction,
  loadFlowDraftAction,
  recordFlowDraftDiscardAction,
  saveFlowDraftAction,
} from './actions'
import {
  diffFlowDraft,
  extractPersistedFlowDraft,
  type PersistedFlowDraft,
} from './draft-persistence'
import {
  mergeDraftHighImpactFromBaseline,
  summariseFieldPath,
} from './draft-merge-helpers'
import {
  clearLegacyLocalFlowDraft,
  loadLegacyLocalFlowDraft,
} from './legacy-local-draft'
import { buildInitialState, useFlowActions, useFlowState } from './store'

const AUTOSAVE_DELAY_MS = 400

/**
 * Splits the changed-field paths from `diffFlowDraft` into low-impact and
 * high-impact buckets. Used by the autosave loop in `flow-draft-sync.tsx`
 * so low-impact fields keep saving on the 400ms tick while high-impact
 * fields are held until the modal resolves.
 */
function partitionDirtyFields(changes: string[]): {
  highImpact: string[]
  lowImpact: string[]
} {
  const highImpact: string[] = []
  const lowImpact: string[] = []
  for (const path of changes) {
    if (isFieldPathHighImpact(path)) highImpact.push(path)
    else lowImpact.push(path)
  }
  return { highImpact, lowImpact }
}

interface PendingHighImpact {
  draft: PersistedFlowDraft
  changedFieldIds: string[]
}

export default function FlowDraftSync({
  brand,
  flowId,
  bookingUrl,
  actorEmail = null,
}: {
  brand: string
  flowId: string
  bookingUrl?: string
  actorEmail?: string | null
}) {
  const state = useFlowState()
  const actions = useFlowActions()
  const bootReadyRef = useRef(false)
  const lastSavedJsonRef = useRef<string | null>(null)
  const lastSavedDraftRef = useRef<PersistedFlowDraft | null>(null)
  const saveErrorShownRef = useRef(false)
  const actionsRef = useRef(actions)
  const draftRef = useRef<ReturnType<typeof extractPersistedFlowDraft> | null>(
    null
  )
  const versionsEnabled = isFlowVersionsEnabled()

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

  const [pendingHighImpact, setPendingHighImpact] =
    useState<PendingHighImpact | null>(null)
  const pendingHighImpactRef = useRef<PendingHighImpact | null>(null)

  useEffect(() => {
    pendingHighImpactRef.current = pendingHighImpact
  }, [pendingHighImpact])

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
    lastSavedDraftRef.current = null
    saveErrorShownRef.current = false
    actionsRef.current.setDraftSyncStatus('loading')

    async function bootstrap() {
      try {
        const remote = await loadFlowDraftAction({ brand, flowId, bookingUrl })
        if (!alive) return

        if (remote) {
          lastSavedJsonRef.current = JSON.stringify(remote)
          lastSavedDraftRef.current = remote
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
          lastSavedDraftRef.current = local
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
      lastSavedDraftRef.current = seedDraft
      bootReadyRef.current = true
      actionsRef.current.setDraftSyncStatus('saved')
    }

    void bootstrap()

    return () => {
      alive = false
    }
  }, [brand, bookingUrl, flowId])

  const performSave = useCallback(
    async (
      draftToSave: PersistedFlowDraft,
      serialized: string,
      changedFieldIds: string[],
      reason: string | null
    ): Promise<boolean> => {
      actionsRef.current.setDraftSyncStatus('saving')
      try {
        const saved = await saveFlowDraftAction({
          brand,
          flowId,
          bookingUrl,
          state: draftToSave,
        })
        if (!saved) {
          if (!saveErrorShownRef.current) {
            actionsRef.current.toast(
              'Could not save this draft yet — we will retry.'
            )
            saveErrorShownRef.current = true
          }
          actionsRef.current.setDraftSyncStatus('error')
          return false
        }
        lastSavedJsonRef.current = serialized
        lastSavedDraftRef.current = draftToSave
        saveErrorShownRef.current = false
        actionsRef.current.setDraftSyncStatus('saved')

        if (versionsEnabled && changedFieldIds.length > 0) {
          // Fire-and-forget: a failed version write must not break the save.
          void createFlowDraftVersionAction({
            brand,
            flowId,
            state: draftToSave,
            reason: reason ?? undefined,
            changedFieldIds,
            actorEmail,
            action: reason ? 'manual_save' : 'autosave',
          }).catch((error) => {
            console.error('createFlowDraftVersionAction failed', error)
          })
        }
        return true
      } catch (error) {
        console.error('Flow draft save failed', error)
        actionsRef.current.setDraftSyncStatus('error')
        if (!saveErrorShownRef.current) {
          actionsRef.current.toast(
            'Could not save this draft yet — we will retry.'
          )
          saveErrorShownRef.current = true
        }
        return false
      }
    },
    [actorEmail, bookingUrl, brand, flowId, versionsEnabled]
  )

  // Strip the held high-impact fields from a draft so the low-impact
  // autosave can run while the modal is still open.
  const buildLowImpactSnapshot = useCallback(
    (currentDraft: PersistedFlowDraft): PersistedFlowDraft => {
      const lastSaved = lastSavedDraftRef.current
      if (!lastSaved) return currentDraft
      const allChanges = diffFlowDraft(lastSaved, currentDraft)
      const highImpactSet = new Set(
        allChanges.filter((path) => isFieldPathHighImpact(path))
      )
      if (highImpactSet.size === 0) return currentDraft
      const merged = mergeDraftHighImpactFromBaseline(
        currentDraft,
        lastSaved,
        highImpactSet
      )
      return merged
    },
    []
  )

  // Autosave loop. Holds high-impact fields until the operator confirms the
  // modal; low-impact edits keep saving on schedule.
  useEffect(() => {
    if (!bootReadyRef.current) return
    if (serializedDraft === lastSavedJsonRef.current) return
    const draftToSave = draftRef.current
    if (!draftToSave) return

    const lastSaved = lastSavedDraftRef.current
    const changes = lastSaved ? diffFlowDraft(lastSaved, draftToSave) : []
    const { highImpact, lowImpact } = partitionDirtyFields(changes)

    actionsRef.current.setDraftSyncStatus('pending')

    const timer = window.setTimeout(() => {
      // Pure low-impact tick: save normally.
      if (highImpact.length === 0 || !versionsEnabled) {
        void performSave(
          draftToSave,
          JSON.stringify(draftToSave),
          changes,
          null
        )
        return
      }

      // Asymmetric save: low-impact saves now, high-impact is held for the
      // modal. Even if there are no low-impact changes we still write a
      // lastSaved checkpoint by recomputing the snapshot.
      if (lowImpact.length > 0) {
        const lowImpactDraft = buildLowImpactSnapshot(draftToSave)
        void performSave(
          lowImpactDraft,
          JSON.stringify(lowImpactDraft),
          lowImpact,
          null
        )
      }

      setPendingHighImpact({
        draft: draftToSave,
        changedFieldIds: highImpact,
      })
    }, AUTOSAVE_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [buildLowImpactSnapshot, performSave, serializedDraft, versionsEnabled])

  const handleConfirm = useCallback(
    async (reason: string) => {
      const pending = pendingHighImpactRef.current
      if (!pending) return
      const success = await performSave(
        pending.draft,
        JSON.stringify(pending.draft),
        pending.changedFieldIds,
        reason
      )
      if (success) {
        actionsRef.current.toast(
          versionsEnabled
            ? 'High-impact change saved and version recorded.'
            : 'Change saved.'
        )
        setPendingHighImpact(null)
      }
    },
    [performSave, versionsEnabled]
  )

  const handleDiscard = useCallback(async () => {
    const pending = pendingHighImpactRef.current
    if (!pending) return
    const lastSaved = lastSavedDraftRef.current
    if (lastSaved) {
      // Revert the held high-impact fields to their last-saved values.
      const reverted = mergeDraftHighImpactFromBaseline(
        pending.draft,
        lastSaved,
        new Set(pending.changedFieldIds)
      )
      // Drop low-impact fields that already changed in `pending.draft` but
      // haven't been saved yet — let the existing low-impact save path
      // handle them on the next tick.
      actionsRef.current.hydrate(reverted)
      lastSavedJsonRef.current = JSON.stringify(reverted)
      lastSavedDraftRef.current = reverted
    }
    if (versionsEnabled) {
      void recordFlowDraftDiscardAction({
        brand,
        flowId,
        changedFieldIds: pending.changedFieldIds,
        actorEmail,
      }).catch((error) => {
        console.error('recordFlowDraftDiscardAction failed', error)
      })
    }
    setPendingHighImpact(null)
    actionsRef.current.toast('Reverted the high-impact change.')
  }, [actorEmail, brand, flowId, versionsEnabled])

  // beforeunload — surface the modal if the operator tries to leave.
  useEffect(() => {
    if (!pendingHighImpact) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [pendingHighImpact])

  if (!versionsEnabled) return null

  return (
    <ConfirmHighImpactModal
      open={pendingHighImpact !== null}
      mode="save"
      changedFieldSummary={
        pendingHighImpact
          ? pendingHighImpact.changedFieldIds.map(summariseFieldPath)
          : undefined
      }
      onConfirm={handleConfirm}
      onDiscard={handleDiscard}
    />
  )
}
