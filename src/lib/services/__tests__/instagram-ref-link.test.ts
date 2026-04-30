import { describe, expect, it } from 'vitest'
import {
  buildInstagramRefLink,
  InstagramRefLinkError,
  parseInstagramRefLink,
} from '@/lib/services/instagram-ref-link'

describe('buildInstagramRefLink', () => {
  it('emits the full UTM payload joined by the literal `__` delimiter', () => {
    const url = buildInstagramRefLink({
      handle: 'vendingpreneurs',
      sourceKey: 'ig_free_masterclass_reel_apr24_comment',
      utm: {
        source: 'meta',
        medium: 'cpc',
        campaign: 'apr_masterclass',
        content: 'reel_a',
        term: 'startup',
      },
      leadVariables: {
        lead_source_key: 'ig_free_masterclass_reel_apr24_comment',
      },
    })

    expect(url).toBe(
      'https://ig.me/m/vendingpreneurs?ref=' +
        'ig_free_masterclass_reel_apr24_comment' +
        '__utm_source=meta' +
        '__utm_medium=cpc' +
        '__utm_campaign=apr_masterclass' +
        '__utm_content=reel_a' +
        '__utm_term=startup' +
        '__lead_source_key=ig_free_masterclass_reel_apr24_comment'
    )
  })

  it('omits empty UTM fields and lead variables', () => {
    const url = buildInstagramRefLink({
      handle: 'vendingpreneurs',
      sourceKey: 'ig_free_masterclass',
      utm: { source: 'meta', medium: '', campaign: undefined },
      leadVariables: { lead_channel: 'Instagram', lead_campaign: '' },
    })

    expect(url).toBe(
      'https://ig.me/m/vendingpreneurs?ref=' +
        'ig_free_masterclass__utm_source=meta__lead_channel=Instagram'
    )
  })

  it('falls back to a legacy-only payload when UTMs are missing', () => {
    const url = buildInstagramRefLink({
      handle: 'vendingpreneurs',
      sourceKey: 'ig_legacy',
      leadVariables: {
        lead_channel: 'Instagram',
        lead_source_key: 'ig_legacy',
      },
    })

    expect(url).toBe(
      'https://ig.me/m/vendingpreneurs?ref=' +
        'ig_legacy__lead_channel=Instagram__lead_source_key=ig_legacy'
    )
  })

  it('URL-encodes spaces, plus signs, ampersands, equals signs, and underscores within values', () => {
    const url = buildInstagramRefLink({
      handle: 'vendingpreneurs',
      sourceKey: 'ig_test',
      utm: {
        source: 'meta',
        // Operator typed `Free Masterclass + bonuses & extras` — the value
        // must round-trip safely through Meta's URL parser.
        campaign: 'Free Masterclass + bonuses & extras',
        // UTM value containing the SendPulse delimiter literally; encoding
        // the value protects the `__` boundary.
        content: 'reel__apr_24',
      },
    })

    expect(url).toContain('utm_source=meta')
    expect(url).toContain(
      'utm_campaign=Free%20Masterclass%20%2B%20bonuses%20%26%20extras'
    )
    // The `__` inside the encoded value must NOT collide with the segment
    // delimiter. encodeURIComponent does not escape underscores, but the
    // value's underscores live AFTER `=`, so the segment splitter recovers
    // the original on parse.
    expect(url).toContain('utm_content=reel__apr_24')
  })

  it('preserves the literal `__` delimiter (no URL encoding of underscores between segments)', () => {
    const url = buildInstagramRefLink({
      handle: 'vendingpreneurs',
      sourceKey: 'src_a',
      utm: { source: 'meta' },
    })
    expect(url).toBe(
      'https://ig.me/m/vendingpreneurs?ref=src_a__utm_source=meta'
    )
    // %5F is the encoded form of `_` — must NOT appear.
    expect(url).not.toContain('%5F')
  })

  it('throws InstagramRefLinkError when the handle is empty', () => {
    expect(() =>
      buildInstagramRefLink({ handle: '', sourceKey: 'src_a' })
    ).toThrow(InstagramRefLinkError)
  })

  it('rejects handles with disallowed characters', () => {
    expect(() =>
      buildInstagramRefLink({ handle: 'has space', sourceKey: 'src_a' })
    ).toThrow(InstagramRefLinkError)
  })

  it('strips a leading `@` from the handle', () => {
    const url = buildInstagramRefLink({
      handle: '@vendingpreneurs',
      sourceKey: 'src_a',
    })
    expect(url).toBe('https://ig.me/m/vendingpreneurs?ref=src_a')
  })

  it('throws when the ref payload exceeds the 480 character cap', () => {
    expect(() =>
      buildInstagramRefLink({
        handle: 'vendingpreneurs',
        sourceKey: 'src_' + 'a'.repeat(500),
      })
    ).toThrow(/exceeds Meta's safe 480-char cap/)
  })

  it('round-trips with parseInstagramRefLink', () => {
    const url = buildInstagramRefLink({
      handle: 'vendingpreneurs',
      sourceKey: 'ig_free_masterclass',
      utm: {
        source: 'meta',
        medium: 'cpc',
        campaign: 'Apr Masterclass',
      },
      adId: 'ad_12345',
      adSetId: 'set_99',
      landingPageUrl: 'https://example.com/lp',
      leadVariables: { lead_channel: 'Instagram' },
    })

    const parsed = parseInstagramRefLink(url)
    expect(parsed).toMatchObject({
      handle: 'vendingpreneurs',
      sourceKey: 'ig_free_masterclass',
      utm: { source: 'meta', medium: 'cpc', campaign: 'Apr Masterclass' },
      adId: 'ad_12345',
      adSetId: 'set_99',
      landingPageUrl: 'https://example.com/lp',
      leadVariables: { lead_channel: 'Instagram' },
    })
  })

  it('returns null from parseInstagramRefLink when URL is not an ig.me link', () => {
    expect(parseInstagramRefLink('https://example.com/?ref=foo')).toBeNull()
    expect(parseInstagramRefLink('not even a url')).toBeNull()
  })
})
