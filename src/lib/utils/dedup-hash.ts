import { createHash } from 'crypto'

export function generateDedupHash(
  scopeId: string,
  content: string,
  timestamp: string
): string {
  return createHash('sha256')
    .update(`${scopeId}|${content}|${timestamp}`)
    .digest('hex')
}
