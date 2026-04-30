import 'server-only'

import { isLiveBrandGuardrailsEnabled } from '@/lib/config'
import {
  DEFAULT_BRAND_GUARDRAILS,
  type BrandGuardrail,
} from '@/lib/prompts/brand-guardrails'

/**
 * Live brand-guardrails resolver — P1.04 seam for the publish path.
 *
 * v0: returns the default empty list. The seam exists so the P2 publish
 * pipeline can swap in a per-brand lookup (`ins_flow_publishes` or similar)
 * without touching `engine.ts`. Empty list = byte-identical baseline prompt,
 * which is the safety invariant.
 *
 * The `LIVE_BRAND_GUARDRAILS_ENABLED` env flag (default `true`) is the
 * deploy-time kill switch.
 */
export async function resolveLiveBrandGuardrails(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _brandName: string
): Promise<BrandGuardrail[]> {
  if (!isLiveBrandGuardrailsEnabled()) return []
  // v0: no published-config table, so the default list is always returned.
  // P2 publish path swaps this for a real lookup.
  return DEFAULT_BRAND_GUARDRAILS
}
