import { getSendPulseConfig } from '@/lib/config'

const API_BASE = 'https://api.sendpulse.com'

type SendResult =
  | { success: true }
  | { success: false; error: string; status?: number }

function getHeaders(): HeadersInit {
  const { SENDPULSE_API_KEY } = getSendPulseConfig()
  return {
    Authorization: `Bearer ${SENDPULSE_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Send a text message to an Instagram contact via SendPulse.
 */
export async function sendInstagramMessage(
  contactId: string,
  text: string
): Promise<SendResult> {
  const res = await fetch(`${API_BASE}/instagram/contacts/send`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      contact_id: contactId,
      messages: [{ type: 'text', message: { text } }],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { success: false, error: body || res.statusText, status: res.status }
  }

  return { success: true }
}

/**
 * Set tags on a SendPulse contact. Tags are additive — existing tags are preserved.
 */
export async function setContactTags(
  contactId: string,
  tags: string[]
): Promise<SendResult> {
  if (tags.length === 0) return { success: true }

  const res = await fetch(`${API_BASE}/instagram/contacts/setTag`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ contact_id: contactId, tags }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { success: false, error: body || res.statusText, status: res.status }
  }

  return { success: true }
}

/**
 * Remove a single tag from a SendPulse contact.
 */
export async function removeContactTag(
  contactId: string,
  tag: string
): Promise<SendResult> {
  const res = await fetch(`${API_BASE}/instagram/contacts/deleteTag`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ contact_id: contactId, tag }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { success: false, error: body || res.statusText, status: res.status }
  }

  return { success: true }
}

/**
 * Pause SendPulse autoflows for a contact to prevent double-responding.
 * Duration in minutes (default 60 — covers a full conversation window).
 */
export async function pauseAutomation(
  contactId: string,
  minutes: number = 60
): Promise<SendResult> {
  const res = await fetch(`${API_BASE}/instagram/contacts/setPauseAutomation`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ contact_id: contactId, pause_time: minutes }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { success: false, error: body || res.statusText, status: res.status }
  }

  return { success: true }
}
