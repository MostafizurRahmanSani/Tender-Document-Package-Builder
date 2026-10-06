import type { Requirement, Status } from '../types'
import { isValidISODate } from './dates'

export const BLOCKING: ReadonlySet<Status> = new Set(['missing', 'expiry_needed', 'expired'])

// The status rules from Section 5 of the problem statement.
export function statusOf(
  req: Pick<Requirement, 'mandatory' | 'has_expiry'>,
  hasFile: boolean,
  expiry: string | undefined,
  deadline: string,
): Status {
  if (!hasFile) return req.mandatory ? 'missing' : 'not_provided'
  if (!req.has_expiry) return 'ok'
  if (!isValidISODate(expiry)) return 'expiry_needed'
  // Same day as the deadline is still OK.
  return expiry < deadline ? 'expired' : 'ok'
}

export function isBlocking(s: Status): boolean {
  return BLOCKING.has(s)
}
