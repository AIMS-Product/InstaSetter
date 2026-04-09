import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  CONVERSATION_STATUSES,
  MESSAGE_ROLES,
  QUALIFICATION_STATUSES,
  CONTACT_SOURCES,
  INTEGRATION_NAMES,
  INTEGRATION_EVENT_STATUSES,
  CALL_OUTCOMES,
  PROMPT_VERSION,
  FIRST_MESSAGE_LIMIT,
  MESSAGE_LIMIT,
  type ConversationStatus,
  type MessageRole,
  type QualificationStatus,
  type ContactSource,
  type IntegrationName,
  type IntegrationEventStatus,
  type CallOutcome,
} from '@/types/enums'

describe('domain enums', () => {
  it('exports all conversation statuses', () => {
    expect(CONVERSATION_STATUSES).toEqual([
      'active',
      'completed',
      'stalled',
      'escalated',
    ])
  })

  it('exports all message roles', () => {
    expect(MESSAGE_ROLES).toEqual(['user', 'assistant'])
  })

  it('exports all qualification statuses', () => {
    expect(QUALIFICATION_STATUSES).toEqual(['hot', 'warm', 'cold'])
  })

  it('exports all contact sources', () => {
    expect(CONTACT_SOURCES).toEqual([
      'keyword',
      'broadcast',
      'organic_dm',
      'comment',
    ])
  })

  it('exports all integration names', () => {
    expect(INTEGRATION_NAMES).toEqual([
      'close_crm',
      'customerio',
      'slack',
      'calendly',
      'inro',
    ])
  })

  it('exports all integration event statuses', () => {
    expect(INTEGRATION_EVENT_STATUSES).toEqual(['pending', 'success', 'failed'])
  })

  it('exports all call outcomes', () => {
    expect(CALL_OUTCOMES).toEqual([
      'showed_up',
      'no_show',
      'closed',
      'not_qualified',
      'needs_follow_up',
    ])
  })

  it('provides type-safe union types', () => {
    expectTypeOf<ConversationStatus>().toEqualTypeOf<
      'active' | 'completed' | 'stalled' | 'escalated'
    >()
    expectTypeOf<MessageRole>().toEqualTypeOf<'user' | 'assistant'>()
    expectTypeOf<QualificationStatus>().toEqualTypeOf<'hot' | 'warm' | 'cold'>()
    expectTypeOf<ContactSource>().toEqualTypeOf<
      'keyword' | 'broadcast' | 'organic_dm' | 'comment'
    >()
    expectTypeOf<IntegrationName>().toEqualTypeOf<
      'close_crm' | 'customerio' | 'slack' | 'calendly' | 'inro'
    >()
    expectTypeOf<IntegrationEventStatus>().toEqualTypeOf<
      'pending' | 'success' | 'failed'
    >()
    expectTypeOf<CallOutcome>().toEqualTypeOf<
      'showed_up' | 'no_show' | 'closed' | 'not_qualified' | 'needs_follow_up'
    >()
  })

  it('exports IG message constants', () => {
    expect(FIRST_MESSAGE_LIMIT).toBe(300)
    expect(MESSAGE_LIMIT).toBe(2000)
    expect(PROMPT_VERSION).toBe('setter-v1')
  })
})
