import { describe, it, expect } from 'vitest'
import { buildSkepticalPlaybook } from '@/lib/prompts/sections/skeptical-playbook'

describe('buildSkepticalPlaybook', () => {
  it('declares the Skeptical / Adversarial Playbook section header', () => {
    const section = buildSkepticalPlaybook()
    expect(section).toContain('## Skeptical / Adversarial Playbook')
  })

  it('describes the three modes: answer-in-depth, keep-qualifying, escalate', () => {
    const section = buildSkepticalPlaybook()
    expect(section).toMatch(/answer in depth/i)
    expect(section).toMatch(/keep qualifying/i)
    expect(section).toMatch(/escalate/i)
  })

  it('names the request_human_review tool and tells the bot to pair it with a bridge message', () => {
    const section = buildSkepticalPlaybook()
    expect(section).toContain('request_human_review')
    expect(section).toMatch(/let me get someone from the team/i)
  })

  it('lists hostile and compliance triggers as escalation paths', () => {
    const section = buildSkepticalPlaybook()
    expect(section).toMatch(/hostile|threatening|aggressive/i)
    expect(section).toMatch(/compliance|legal|fraud|regulator/i)
  })

  it('disambiguates skeptical-on-topic from off-topic — both should NOT use the off-topic handler', () => {
    const section = buildSkepticalPlaybook()
    expect(section).toMatch(/off-topic handler/i)
  })

  it('tells the bot to stop replying after escalation (the system pauses)', () => {
    const section = buildSkepticalPlaybook()
    expect(section).toMatch(/system pauses|do not keep replying/i)
  })
})
