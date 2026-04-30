// Pure heuristic: given a simulator turn, infer which Flow Builder block
// is currently "responding". Used by the canvas highlight, the simulator chip,
// and the inspector active pill so all three surfaces share one signal source.
//
// The function is deliberately client-side: tool calls and reply text are
// already on the wire after `simReceive`. No new server inference is needed.
// If a future engine populates `Turn.block` directly, this helper still
// honours it — the explicit field always wins.

import { FLOW_BUILDER_LABELS } from '@/lib/dashboard/flow-builder-labels'
import type { BlockType, Flow, Turn } from '../../types'

// Tool name constants. These mirror `KNOWN_TOOLS` in
// `src/lib/services/engine.ts`. We re-declare here to avoid pulling a server
// module into the client bundle. If the engine renames a tool, the matching
// constant here must follow — caught by manual review and the inference test
// suite (book_call → booking, capture_email → email, qualify_lead → escalation).
export const TOOL_NAME_BOOK_CALL = 'book_call'
export const TOOL_NAME_CAPTURE_EMAIL = 'capture_email'
export const TOOL_NAME_QUALIFY_LEAD = 'qualify_lead'

export interface InferActiveBlockArgs {
  turn: Turn
  selectedBlockId: BlockType | null
  flow: Pick<Flow, 'brand' | 'nodes'>
  /**
   * Brand booking URL (or any reliable substring of it). When the bot's reply
   * contains this substring, the heuristic infers `booking`. Caller resolves
   * the URL from `state.variables` because the store is the source of truth.
   * Omit to skip the URL rule entirely (avoids false positives when no URL is
   * configured for the brand yet).
   */
  bookingUrlSubstring?: string
}

/**
 * Returns the inferred active block for a simulator turn, or null when the
 * caller has no signal AND no fallback selection.
 *
 * Precedence (highest first):
 *   1. `turn.block` if the engine populated it explicitly
 *   2. `book_call` tool call → `booking`
 *   3. `capture_email` tool call → `email`
 *   4. `qualify_lead` tool call → `escalation`
 *   5. Reply text contains the brand booking URL → `booking`
 *   6. Fall back to `selectedBlockId` (the operator's pinned block)
 *   7. Otherwise null
 *
 * Pure function — no React, no store, no IO. Safe to test in isolation.
 */
export function inferActiveBlock(args: InferActiveBlockArgs): BlockType | null {
  const { turn, selectedBlockId, bookingUrlSubstring } = args

  if (turn.block) {
    return turn.block
  }

  const toolNames = (turn.toolCalls ?? []).map((call) => call.name)

  if (toolNames.includes(TOOL_NAME_BOOK_CALL)) return 'booking'
  if (toolNames.includes(TOOL_NAME_CAPTURE_EMAIL)) return 'email'
  if (toolNames.includes(TOOL_NAME_QUALIFY_LEAD)) return 'escalation'

  const trimmedUrl = bookingUrlSubstring?.trim()
  if (trimmedUrl && turn.text && turn.text.includes(trimmedUrl)) {
    return 'booking'
  }

  return selectedBlockId
}

/**
 * Returns the operator-facing display label for a block type. Reads from the
 * shared catalog so legend, chip, and pill all render the same string.
 *
 * When `blockType` is null the helper returns the optional fallback (or an
 * empty string) so callers can render placeholder copy without branching.
 */
export function getActiveBlockLabel(
  blockType: BlockType | null,
  fallback?: string
): string {
  if (!blockType) return fallback ?? ''
  return FLOW_BUILDER_LABELS.blocks[blockType].display
}
