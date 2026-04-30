import { describe, expect, it } from 'vitest'
import {
  aggregateFunnelRows,
  UNATTRIBUTED_KEY,
  UNATTRIBUTED_LABEL,
  type CreativeFunnelRawRow,
} from '@/lib/services/creative-funnel-types'

let conversationCounter = 0

function makeRow(
  sourceId: string | null,
  sourceLabel: string | null,
  utmSource: string | null,
  utmMedium: string | null,
  utmCampaign: string | null,
  utmContent: string | null,
  isQualified: boolean,
  isBooked: boolean
): CreativeFunnelRawRow {
  conversationCounter += 1
  return {
    conversation_id: `conv-${conversationCounter}`,
    source_id: sourceId,
    source_label: sourceLabel,
    channel: null,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: null,
    ad_id: null,
    ad_set_id: null,
    is_qualified: isQualified,
    is_booked: isBooked,
    is_sent_to_close: false,
  }
}

function makeRows(
  count: number,
  ...args: [
    string | null,
    string | null,
    string | null,
    string | null,
    string | null,
    string | null,
    boolean,
    boolean,
  ]
): CreativeFunnelRawRow[] {
  return Array.from({ length: count }, () => makeRow(...args))
}

// 5-source / 25-conversation fabricated fixture per the spec acceptance
// criteria. Each row mimics a real `v_creative_funnel` row — qualification,
// booking, and Close-id are independent flags so we can hand-verify counts.
//
// Layout summary:
//   src-A (Meta · Reel A): 8 DMs, 5 qualified, 5 booked, 2 close
//   src-B (Organic Bio):   4 DMs, 1 qualified, 0 booked, 0 close
//   src-C (Meta · Reel B): 6 DMs, 4 qualified, 2 booked, 0 close (Close not wired)
//   src-D (TikTok import): 3 DMs, 2 qualified, 1 booked, 0 close
//   unattributed:          4 DMs, 1 qualified, 0 booked, 0 close
const FIXTURE: CreativeFunnelRawRow[] = [
  // --- src-A ---
  ...makeRows(
    5,
    'src-A',
    'Meta Reel A',
    'meta',
    'cpc',
    'apr',
    'reel_a',
    true,
    true
  ),
  ...makeRows(
    3,
    'src-A',
    'Meta Reel A',
    'meta',
    'cpc',
    'apr',
    'reel_a',
    false,
    false
  ),
  // --- src-B ---
  ...makeRows(
    1,
    'src-B',
    'Organic Bio',
    null,
    'organic',
    null,
    null,
    true,
    false
  ),
  ...makeRows(
    3,
    'src-B',
    'Organic Bio',
    null,
    'organic',
    null,
    null,
    false,
    false
  ),
  // --- src-C ---
  ...makeRows(
    4,
    'src-C',
    'Meta Reel B',
    'meta',
    'cpc',
    'apr',
    'reel_b',
    true,
    false
  ),
  ...makeRows(
    2,
    'src-C',
    'Meta Reel B',
    'meta',
    'cpc',
    'apr',
    'reel_b',
    false,
    false
  ),
  // --- src-D ---
  ...makeRows(
    1,
    'src-D',
    'TikTok Import',
    'tiktok',
    'social',
    'mar',
    null,
    true,
    true
  ),
  ...makeRows(
    1,
    'src-D',
    'TikTok Import',
    'tiktok',
    'social',
    'mar',
    null,
    true,
    false
  ),
  ...makeRows(
    1,
    'src-D',
    'TikTok Import',
    'tiktok',
    'social',
    'mar',
    null,
    false,
    false
  ),
  // --- unattributed ---
  ...makeRows(1, null, null, null, null, null, null, true, false),
  ...makeRows(3, null, null, null, null, null, null, false, false),
]
// Promote 2 src-A is_sent_to_close, 0 elsewhere (Close-not-yet-wired-broadly).
FIXTURE[0].is_sent_to_close = true
FIXTURE[1].is_sent_to_close = true
// Promote 2 src-C qualified rows into is_booked. src-C qualified block starts
// at index 12 (5 + 3 + 1 + 3 = 12).
FIXTURE[12].is_booked = true
FIXTURE[13].is_booked = true

describe('aggregateFunnelRows', () => {
  describe('group by source', () => {
    it('produces one row per distinct source_id with correct counts', () => {
      const rows = aggregateFunnelRows(FIXTURE, 'source', 'dms', 'desc')

      // 4 sources + 1 unattributed bucket = 5 rows
      expect(rows).toHaveLength(5)

      const a = rows.find((r) => r.groupKey === 'src-A')
      expect(a).toMatchObject({
        groupKey: 'src-A',
        groupLabel: 'Meta Reel A',
        dms: 8,
        qualified: 5,
        booked: 5,
        sentToClose: 2,
      })

      const b = rows.find((r) => r.groupKey === 'src-B')
      expect(b).toMatchObject({
        groupKey: 'src-B',
        dms: 4,
        qualified: 1,
        booked: 0,
        sentToClose: 0,
      })

      const c = rows.find((r) => r.groupKey === 'src-C')
      expect(c).toMatchObject({
        groupKey: 'src-C',
        dms: 6,
        qualified: 4,
        booked: 2,
        sentToClose: 0,
      })

      const d = rows.find((r) => r.groupKey === 'src-D')
      expect(d).toMatchObject({
        groupKey: 'src-D',
        dms: 3,
        qualified: 2,
        booked: 1,
        sentToClose: 0,
      })

      const unattributed = rows.find((r) => r.groupKey === UNATTRIBUTED_KEY)
      expect(unattributed).toMatchObject({
        groupLabel: UNATTRIBUTED_LABEL,
        dms: 4,
        qualified: 1,
        booked: 0,
        sentToClose: 0,
      })
    })

    it('computes conversion rates with safe zero-denominator handling', () => {
      const rows = aggregateFunnelRows(FIXTURE, 'source', 'dms', 'desc')

      const a = rows.find((r) => r.groupKey === 'src-A')!
      // 5 qualified / 8 DMs
      expect(a.rates.qualifiedFromDms).toBeCloseTo(5 / 8)
      expect(a.rates.bookedFromDms).toBeCloseTo(5 / 8)
      expect(a.rates.bookedFromQualified).toBeCloseTo(5 / 5)
      expect(a.rates.closeFromDms).toBeCloseTo(2 / 8)

      const b = rows.find((r) => r.groupKey === 'src-B')!
      // 0 booked / 1 qualified — rate is 0 (real zero), not null
      expect(b.rates.bookedFromQualified).toBe(0)

      // A row with zero qualified has a null bookedFromQualified rate.
      const zeroQualifiedRows = aggregateFunnelRows(
        [
          makeRow(
            'src-Z',
            'Empty Source',
            null,
            null,
            null,
            null,
            false,
            false
          ),
        ],
        'source',
        'dms',
        'desc'
      )
      expect(zeroQualifiedRows[0].rates.bookedFromQualified).toBeNull()
    })

    it('sorts by dms desc by default with label tie-break ascending', () => {
      const rows = aggregateFunnelRows(FIXTURE, 'source', 'dms', 'desc')
      // Order: src-A(8), src-C(6), src-B(4), unattributed(4), src-D(3)
      // Tie between src-B and unattributed (both 4). Tie-break label ASC:
      // "(unattributed)" < "Organic Bio" (`(` is 0x28, `O` is 0x4F).
      expect(rows.map((r) => r.groupKey)).toEqual([
        'src-A',
        'src-C',
        UNATTRIBUTED_KEY,
        'src-B',
        'src-D',
      ])
    })

    it('sorts by bookedFromDms desc with null rates trailing', () => {
      const rows = aggregateFunnelRows(
        FIXTURE,
        'source',
        'bookedFromDms',
        'desc'
      )
      // Rates: src-A 5/8 = 0.625, src-C 2/6 ≈ 0.333, src-D 1/3 ≈ 0.333,
      // src-B 0/4 = 0, unattributed 0/4 = 0. Tie-break label ASC.
      // src-C label "Meta Reel B", src-D label "TikTok Import" -> src-C first.
      expect(rows.map((r) => r.groupKey)).toEqual([
        'src-A',
        'src-C',
        'src-D',
        UNATTRIBUTED_KEY,
        'src-B',
      ])
    })

    it('sorts ascending when dir=asc', () => {
      const rows = aggregateFunnelRows(FIXTURE, 'source', 'dms', 'asc')
      expect(rows[0].groupKey).toBe('src-D') // 3 DMs is the smallest
    })
  })

  describe('group by utm_source', () => {
    it('rolls up multiple sources sharing utm_source into one bucket', () => {
      const rows = aggregateFunnelRows(FIXTURE, 'utm_source', 'dms', 'desc')

      // meta = src-A (8) + src-C (6) = 14 DMs
      const meta = rows.find((r) => r.groupKey === 'meta')
      expect(meta).toMatchObject({
        groupKey: 'meta',
        groupLabel: 'meta',
        dms: 14,
        qualified: 9,
        booked: 7,
        sentToClose: 2,
      })

      const tiktok = rows.find((r) => r.groupKey === 'tiktok')
      expect(tiktok).toMatchObject({ groupKey: 'tiktok', dms: 3 })

      // Conversations whose utm_source is null roll up under (unattributed)
      const unattributed = rows.find((r) => r.groupKey === UNATTRIBUTED_KEY)
      expect(unattributed).toMatchObject({
        groupKey: UNATTRIBUTED_KEY,
        groupLabel: UNATTRIBUTED_LABEL,
        // src-B (4) + the 4 truly-unattributed rows = 8
        dms: 8,
      })
    })
  })

  describe('group by channel', () => {
    it('rolls up by channel with null channel as unattributed', () => {
      const rows = aggregateFunnelRows(FIXTURE, 'channel', 'dms', 'desc')
      // None of the FIXTURE rows have a channel (we leave channel null and use
      // utm_* for the meta-channel signal). Everything rolls up to unattributed.
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        groupKey: UNATTRIBUTED_KEY,
        dms: 25,
      })
    })
  })

  describe('empty + edge cases', () => {
    it('returns no rows when input is empty', () => {
      expect(aggregateFunnelRows([], 'source', 'dms', 'desc')).toEqual([])
    })

    it('handles a single conversation with all flags false', () => {
      const rows = aggregateFunnelRows(
        [makeRow(null, null, null, null, null, null, false, false)],
        'source',
        'dms',
        'desc'
      )
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        groupKey: UNATTRIBUTED_KEY,
        dms: 1,
        qualified: 0,
        booked: 0,
        sentToClose: 0,
      })
      expect(rows[0].rates.qualifiedFromDms).toBe(0)
      expect(rows[0].rates.bookedFromQualified).toBeNull()
    })
  })
})
