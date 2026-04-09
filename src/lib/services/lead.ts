import type { QualificationStatus } from '@/types/enums'

// ---------------------------------------------------------------------------
// Qualification thresholds (placeholders pending sales team input)
// ---------------------------------------------------------------------------

export const HOT_MACHINE_THRESHOLD = 5

// ---------------------------------------------------------------------------
// determineQualification — pure function, no database
// ---------------------------------------------------------------------------

interface QualificationInput {
  callBooked: boolean
  emailCaptured: boolean
  machineCount?: number
}

export function determineQualification(
  input: QualificationInput
): QualificationStatus {
  const { callBooked, emailCaptured, machineCount = 0 } = input

  // Call booked is an unconditional override
  if (callBooked) return 'hot'

  // High engagement + email = hot
  if (machineCount >= HOT_MACHINE_THRESHOLD && emailCaptured) return 'hot'

  // Email alone = warm
  if (emailCaptured) return 'warm'

  return 'cold'
}
