import { describe, expect, it } from 'vitest'
import { statusOf, isBlocking } from './status'
import { isValidISODate, todayLocalISO } from './dates'
import { parseRequirements } from './requirements'
import { findDuplicates } from './duplicates'
import { assign, unassign, removeFile, setExpiry, duplicateLock, EMPTY_MATCHES } from './match'
import { hasPdfSignature, limitProblem, MAX_FILES, MAX_TOTAL_BYTES } from './upload'
import { suggestMatches } from './autoMatch'
import type { Requirement, UploadedFile } from '../types'

const DL = '2026-10-20'
const mand = { mandatory: true, has_expiry: false }
const opt = { mandatory: false, has_expiry: false }
const mandExp = { mandatory: true, has_expiry: true }
const optExp = { mandatory: false, has_expiry: true }

describe('statusOf (Section 5)', () => {
  it('missing / not provided when no file', () => {
    expect(statusOf(mand, false, undefined, DL)).toBe('missing')
    expect(statusOf(mandExp, false, '2030-01-01', DL)).toBe('missing')
    expect(statusOf(opt, false, undefined, DL)).toBe('not_provided')
    expect(statusOf(optExp, false, undefined, DL)).toBe('not_provided')
  })
  it('ok when matched and no expiry needed, even with a stray date', () => {
    expect(statusOf(mand, true, undefined, DL)).toBe('ok')
    expect(statusOf(mand, true, '2000-01-01', DL)).toBe('ok')
  })
  it('expiry date needed', () => {
    expect(statusOf(mandExp, true, undefined, DL)).toBe('expiry_needed')
    expect(statusOf(mandExp, true, '', DL)).toBe('expiry_needed')
    expect(statusOf(optExp, true, '2026-02-30', DL)).toBe('expiry_needed')
  })
  it('expired only when before the deadline; same day is OK', () => {
    expect(statusOf(mandExp, true, '2026-10-19', DL)).toBe('expired')
    expect(statusOf(mandExp, true, '2025-06-30', DL)).toBe('expired')
    expect(statusOf(mandExp, true, '2026-10-20', DL)).toBe('ok')
    expect(statusOf(mandExp, true, '2026-10-21', DL)).toBe('ok')
    expect(statusOf(optExp, true, '2026-01-01', DL)).toBe('expired')
  })
  it('blocking set', () => {
    expect(['missing', 'expiry_needed', 'expired'].every((s) => isBlocking(s as never))).toBe(true)
    expect(isBlocking('ok')).toBe(false)
    expect(isBlocking('not_provided')).toBe(false)
  })
})

describe('dates', () => {
  it('validates real calendar dates', () => {
    expect(isValidISODate('2024-02-29')).toBe(true)
    expect(isValidISODate('2025-02-29')).toBe(false)
    expect(isValidISODate('2026-13-01')).toBe(false)
    expect(isValidISODate('20-10-2026')).toBe(false)
  })
  it('uses the local date', () => {
    expect(todayLocalISO(new Date(2026, 9, 6, 23, 59))).toBe('2026-10-06')
  })
})

const json = (o: unknown) => JSON.stringify(o)
const tender = { tender_id: 'T-1', title: 'X', procuring_entity: 'P', bidder: 'B', submission_deadline: DL }
const req = (id: string, order: number, extra = {}) => ({ id, order, title_en: id, title_bn: id, mandatory: true, has_expiry: false, ...extra })

describe('parseRequirements', () => {
  it('sorts by order', () => {
    const r = parseRequirements(json({ tender, requirements: [req('B', 2), req('A', 1), req('C', 3)] }))
    expect(r.ok && r.requirements.map((x) => x.id)).toEqual(['A', 'B', 'C'])
  })
  it('rejects bad input with a clear reason', () => {
    expect(parseRequirements('{oops').ok).toBe(false)
    const badDl = parseRequirements(json({ tender: { ...tender, submission_deadline: '2026-02-30' }, requirements: [req('A', 1)] }))
    expect(!badDl.ok && badDl.error.key).toBe('err_deadline')
    const dup = parseRequirements(json({ tender, requirements: [req('A', 1), req('A', 2)] }))
    expect(!dup.ok && dup.error.key).toBe('err_duplicate_id')
    const missing = parseRequirements(json({ tender, requirements: [{ ...req('A', 1), mandatory: 'yes' }] }))
    expect(!missing.ok && missing.error).toEqual({ key: 'err_requirement', index: 1, field: 'mandatory' })
    const empty = parseRequirements(json({ tender, requirements: [] }))
    expect(!empty.ok && empty.error.key).toBe('err_no_requirements')
  })
  it('falls back to English when title_bn is missing', () => {
    const r = parseRequirements(json({ tender, requirements: [{ id: 'A', order: 1, title_en: 'Trade', mandatory: true, has_expiry: true }] }))
    expect(r.ok && r.requirements[0].title_bn).toBe('Trade')
  })
})

const file = (id: string, hash: string, name = id + '.pdf', state: UploadedFile['state'] = 'ready'): UploadedFile => ({
  id, name, size: 1, pages: 1, hash, bytes: null, state,
})

describe('duplicates', () => {
  it('groups same content regardless of name, ignores error files', () => {
    const d = findDuplicates([file('a', 'h1'), file('b', 'h1'), file('c', 'h2'), file('d', 'h1'), file('e', 'h2', 'e', 'error')])
    expect(d.get('a')).toEqual(['b', 'd'])
    expect(d.has('c')).toBe(false)
    expect(d.has('e')).toBe(false)
  })
})

describe('matching', () => {
  const dupes = findDuplicates([file('f1', 'x'), file('f2', 'x'), file('f3', 'y')])
  it('one file per requirement and one requirement per file', () => {
    let s = assign(EMPTY_MATCHES, 'R1', 'f3', dupes)
    s = assign(s, 'R2', 'f3', dupes) // moves
    expect(s.matches).toEqual({ R2: 'f3' })
    s = assign(s, 'R2', 'f1', dupes) // replaces
    expect(s.matches).toEqual({ R2: 'f1' })
  })
  it('duplicates cannot be matched to different documents', () => {
    const s = assign(EMPTY_MATCHES, 'R1', 'f1', dupes)
    expect(duplicateLock(s, 'f2', dupes)).toBe('f1')
    expect(assign(s, 'R2', 'f2', dupes)).toBe(s)
  })
  it('expiry is cleared when the file changes or is removed', () => {
    let s = assign(EMPTY_MATCHES, 'R1', 'f3', dupes)
    s = setExpiry(s, 'R1', '2027-01-01')
    expect(assign(s, 'R1', 'f1', dupes).expiry).toEqual({})
    expect(unassign(s, 'R1')).toEqual(EMPTY_MATCHES)
    expect(removeFile(s, 'f3')).toEqual(EMPTY_MATCHES)
  })
})

describe('upload checks', () => {
  it('checks the PDF signature', () => {
    expect(hasPdfSignature(new TextEncoder().encode('%PDF-1.4'))).toBe(true)
    expect(hasPdfSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe(false)
  })
  it('enforces 30 files and 50 MB', () => {
    expect(limitProblem(MAX_FILES - 1, 0, 10)).toBe(null)
    expect(limitProblem(MAX_FILES, 0, 10)).toBe('too_many')
    expect(limitProblem(0, MAX_TOTAL_BYTES - 5, 10)).toBe('too_big')
    expect(limitProblem(0, MAX_TOTAL_BYTES - 10, 10)).toBe(null)
  })
})

describe('auto-match', () => {
  const reqs: Requirement[] = [
    'Trade License', 'TIN Certificate', 'VAT Registration Certificate', 'Bank Solvency Certificate', 'Experience Certificate',
    'Audited Financial Statement', "Manufacturer's Authorization", 'Technical Proposal', 'Financial Proposal', 'Signed Declaration',
  ].map((t, i) => ({ id: `R${String(i + 1).padStart(2, '0')}`, order: i + 1, title_en: t, title_bn: t, mandatory: true, has_expiry: false }))
  const names = ['01_financial_proposal.pdf', '02_technical_proposal.pdf', '03_tin_certificate.pdf', '04_vat_certificate.pdf', 'bank_solvency.pdf',
    'experience_cert (1).pdf', 'experience_cert.pdf', 'scan_0042.pdf', 'trade_license_2025.pdf', 'trade_license_2026.pdf']
  const files = names.map((n, i) => file(`f${i}`, n.startsWith('experience') ? 'dup' : `h${i}`, n))

  it('matches the sample pack by name, prefers the newest year and the original copy', () => {
    const pairs = Object.fromEntries(suggestMatches(reqs, files, { reqs: new Set(), files: new Set() }).map(([r, f]) => [r, files.find((x) => x.id === f)!.name]))
    expect(pairs).toEqual({
      R01: 'trade_license_2026.pdf',
      R02: '03_tin_certificate.pdf',
      R03: '04_vat_certificate.pdf',
      R04: 'bank_solvency.pdf',
      R05: 'experience_cert.pdf',
      R08: '02_technical_proposal.pdf',
      R09: '01_financial_proposal.pdf',
    })
  })
})
