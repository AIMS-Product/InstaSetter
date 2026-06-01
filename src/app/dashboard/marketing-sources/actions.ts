'use server'

import { revalidatePath } from 'next/cache'
import {
  archiveMarketingSource,
  createMarketingSource,
} from '@/lib/services/marketing-sources'
import { assertDashboardActionAuthorized } from '@/lib/dashboard-action-auth'

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

export async function createMarketingSourceAction(formData: FormData) {
  await assertDashboardActionAuthorized()

  const required = [
    'channel',
    'campaign',
    'material',
    'entryAction',
    'triggerLabel',
  ]
  for (const key of required) {
    if (!value(formData, key)) {
      throw new Error(`Missing ${key}`)
    }
  }

  const result = await createMarketingSource({
    label: value(formData, 'label'),
    channel: value(formData, 'channel'),
    campaign: value(formData, 'campaign'),
    material: value(formData, 'material'),
    entryAction: value(formData, 'entryAction'),
    triggerLabel: value(formData, 'triggerLabel'),
    postUrl: value(formData, 'postUrl'),
    adId: value(formData, 'adId'),
    notes: value(formData, 'notes'),
    utmSource: value(formData, 'utmSource'),
    utmMedium: value(formData, 'utmMedium'),
    utmCampaign: value(formData, 'utmCampaign'),
    utmContent: value(formData, 'utmContent'),
    utmTerm: value(formData, 'utmTerm'),
    adSetId: value(formData, 'adSetId'),
    landingPageUrl: value(formData, 'landingPageUrl'),
  })

  if (!result.success) throw new Error(result.error)
  revalidatePath('/dashboard/marketing-sources')
}

export async function archiveMarketingSourceAction(formData: FormData) {
  await assertDashboardActionAuthorized()

  const id = value(formData, 'id')
  if (!id) throw new Error('Missing source id')

  const result = await archiveMarketingSource(id)
  if (!result.success) throw new Error(result.error)
  revalidatePath('/dashboard/marketing-sources')
}
