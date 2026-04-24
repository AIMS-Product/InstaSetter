import { describe, expect, it } from 'vitest'
import {
  BRAND_INBOX_STATUS,
  RELEASE_STATUS_INTRO,
  VARIABLE_REFERENCE_STATUS,
  getDraftSaveStatus,
  getDraftWorkspaceStatus,
  getLiveRuntimeStatus,
  getSimulatorStatus,
} from '../surface-status'

describe('surface status copy', () => {
  it('marks dirty drafts as unpublished but not live', () => {
    const status = getDraftWorkspaceStatus(true)

    expect(status.label).toBe('Unpublished edits')
    expect(String(status.detail)).toContain('not live in Instagram')
  })

  it('treats clean drafts as having no pending editor changes', () => {
    const status = getDraftWorkspaceStatus(false)

    expect(status.label).toBe('No unpublished edits')
    expect(String(status.detail)).toContain('no unpublished editor changes')
  })

  it('reports Supabase save state separately from publish state', () => {
    expect(getDraftSaveStatus('pending').label).toBe('Save pending')
    expect(getDraftSaveStatus('saving').label).toBe('Saving draft')
    expect(getDraftSaveStatus('saved').label).toBe('Saved to Supabase')
    expect(getDraftSaveStatus('error').label).toBe('Save failed')
  })

  it('describes simulator preview mode when compile is enabled', () => {
    const status = getSimulatorStatus(true)

    expect(status.label).toBe('Draft preview')
    expect(String(status.detail)).toContain('draft overrides')
  })

  it('describes live-prompt simulator mode when compile is disabled', () => {
    const status = getSimulatorStatus(false)

    expect(status.label).toBe('Live prompt only')
    expect(String(status.detail)).toContain('without draft overrides')
  })

  it('keeps scope messaging explicit across marketing-facing tabs', () => {
    expect(BRAND_INBOX_STATUS.label).toBe('Brand-wide only')
    expect(String(BRAND_INBOX_STATUS.detail)).toContain('flow_id')
    expect(VARIABLE_REFERENCE_STATUS.label).toBe('Reference only')
    expect(RELEASE_STATUS_INTRO.label).toBe('Release status')
    expect(getLiveRuntimeStatus().label).toBe('Live: setter-v2')
  })
})
