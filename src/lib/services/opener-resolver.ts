import { DEFAULT_OPENER_STEP, type OpenerStep } from '@/lib/prompts/opener-step'
import { isLiveOpenerStepEnabled } from '@/lib/config'

/**
 * Resolves the active opener step for the live engine.
 *
 * v0 returns the code-shipped default for every brand, gated by the env flag.
 * Future P2 work replaces this body with a published-config lookup, keyed by
 * brand. Callers (the engine) treat this as the single seam for the live
 * opener step — they do not import DEFAULT_OPENER_STEP directly.
 *
 * The brand argument is accepted today so the seam shape matches the future
 * per-brand resolution without another refactor. Currently unused.
 */
export function resolveLiveOpenerStep(_brandName: string): OpenerStep {
  if (!isLiveOpenerStepEnabled()) {
    return { ...DEFAULT_OPENER_STEP, enabled: false }
  }
  return { ...DEFAULT_OPENER_STEP }
}
