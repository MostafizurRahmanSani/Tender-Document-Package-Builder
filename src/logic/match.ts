import type { MatchState } from '../types'

export const EMPTY_MATCHES: MatchState = { matches: {}, expiry: {} }

// Which requirement a file is matched to, if any.
export function requirementOf(state: MatchState, fileId: string): string | undefined {
  return Object.keys(state.matches).find((r) => state.matches[r] === fileId)
}

// If a copy of this file (same content) is already matched elsewhere, returns that copy's id.
export function duplicateLock(state: MatchState, fileId: string, dupes: Map<string, string[]>): string | undefined {
  const twins = dupes.get(fileId) ?? []
  return twins.find((id) => requirementOf(state, id) !== undefined)
}

// Match a file to a requirement. One requirement gets one file and one file goes
// to one requirement, so an earlier match on either side is replaced. The expiry
// date belongs to the old file, so it is cleared whenever the file changes.
export function assign(state: MatchState, reqId: string, fileId: string, dupes: Map<string, string[]>): MatchState {
  if (state.matches[reqId] === fileId) return state
  if (duplicateLock(state, fileId, dupes)) return state

  const matches = { ...state.matches }
  const expiry = { ...state.expiry }
  const from = requirementOf(state, fileId)
  if (from) {
    delete matches[from]
    delete expiry[from]
  }
  matches[reqId] = fileId
  delete expiry[reqId]
  return { matches, expiry }
}

export function unassign(state: MatchState, reqId: string): MatchState {
  if (!(reqId in state.matches)) return state
  const matches = { ...state.matches }
  const expiry = { ...state.expiry }
  delete matches[reqId]
  delete expiry[reqId]
  return { matches, expiry }
}

export function removeFile(state: MatchState, fileId: string): MatchState {
  const req = requirementOf(state, fileId)
  return req ? unassign(state, req) : state
}

export function setExpiry(state: MatchState, reqId: string, value: string): MatchState {
  const expiry = { ...state.expiry }
  if (value) expiry[reqId] = value
  else delete expiry[reqId]
  return { ...state, expiry }
}
