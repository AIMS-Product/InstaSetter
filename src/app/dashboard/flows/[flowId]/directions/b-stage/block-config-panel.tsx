'use client'

import type { BlockConfig } from '../../types'
import { BookingPanel } from './block-panels/booking'
import { EmailPanel } from './block-panels/email'
import { EscalationPanel } from './block-panels/escalation'
import { FollowupPanel } from './block-panels/followup'
import { ObjectionPanel } from './block-panels/objection'
import { OpeningPanel } from './block-panels/opening'
import { QualifierPanel } from './block-panels/qualifier'
import { SummaryPanel } from './block-panels/summary'

export function BlockConfigPanel({
  config,
  onChange,
}: {
  config: BlockConfig | undefined
  onChange?: (config: BlockConfig) => void
}) {
  if (!config) return null
  switch (config.kind) {
    case 'opening':
      return <OpeningPanel config={config} />
    case 'qualifier':
      return <QualifierPanel config={config} />
    case 'objection':
      return <ObjectionPanel config={config} />
    case 'booking':
      return <BookingPanel config={config} />
    case 'email':
      return <EmailPanel config={config} onChange={onChange} />
    case 'followup':
      return <FollowupPanel config={config} />
    case 'escalation':
      return <EscalationPanel config={config} />
    case 'summary':
      return <SummaryPanel config={config} />
  }
}
