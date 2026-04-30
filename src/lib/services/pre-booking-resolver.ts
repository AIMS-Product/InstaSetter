import {
  DEFAULT_PRE_BOOKING_STEP,
  type PreBookingStep,
} from '@/lib/prompts/pre-booking-step'
import { isLivePreBookingStepEnabled } from '@/lib/config'

/**
 * Resolves the active pre-booking rapport step for the live engine.
 *
 * v0 returns the code-shipped default for every brand, gated by the env flag.
 * Future P2 work replaces this body with a published-config lookup, keyed by
 * brand. Callers (the engine) treat this as the single seam for the live
 * rapport step — they do not import DEFAULT_PRE_BOOKING_STEP directly.
 *
 * The brand argument is accepted today so the seam shape matches the future
 * per-brand resolution without another refactor. Currently unused.
 */
export function resolveLivePreBookingStep(_brandName: string): PreBookingStep {
  if (!isLivePreBookingStepEnabled()) {
    return { ...DEFAULT_PRE_BOOKING_STEP, enabled: false }
  }
  return { ...DEFAULT_PRE_BOOKING_STEP }
}
