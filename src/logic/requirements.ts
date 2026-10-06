import type { Requirement, Tender } from '../types'
import { isValidISODate } from './dates'

export type ParseError =
  | { key: 'err_json' }
  | { key: 'err_tender_field'; field: string }
  | { key: 'err_deadline' }
  | { key: 'err_no_requirements' }
  | { key: 'err_requirement'; index: number; field: string }
  | { key: 'err_duplicate_id'; id: string }

export type ParseResult =
  | { ok: true; tender: Tender; requirements: Requirement[] }
  | { ok: false; error: ParseError }

const TENDER_FIELDS = ['tender_id', 'title', 'procuring_entity', 'bidder', 'submission_deadline'] as const

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

// Reads requirements.json, checks every field and returns the list sorted by `order`.
export function parseRequirements(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text.replace(/^﻿/, ''))
  } catch {
    return { ok: false, error: { key: 'err_json' } }
  }
  if (!isObj(data) || !isObj(data.tender)) return { ok: false, error: { key: 'err_tender_field', field: 'tender' } }

  const t = data.tender
  for (const f of TENDER_FIELDS) {
    if (!isText(t[f])) return { ok: false, error: { key: 'err_tender_field', field: f } }
  }
  const deadline = (t.submission_deadline as string).trim()
  if (!isValidISODate(deadline)) return { ok: false, error: { key: 'err_deadline' } }

  if (!Array.isArray(data.requirements) || data.requirements.length === 0) {
    return { ok: false, error: { key: 'err_no_requirements' } }
  }

  const seen = new Set<string>()
  const requirements: Requirement[] = []
  for (const [i, r] of data.requirements.entries()) {
    const bad = (field: string): ParseResult => ({ ok: false, error: { key: 'err_requirement', index: i + 1, field } })
    if (!isObj(r)) return bad('item')
    if (!isText(r.id)) return bad('id')
    if (typeof r.order !== 'number' || !Number.isFinite(r.order)) return bad('order')
    if (!isText(r.title_en)) return bad('title_en')
    if (typeof r.mandatory !== 'boolean') return bad('mandatory')
    if (typeof r.has_expiry !== 'boolean') return bad('has_expiry')
    const id = r.id.trim()
    if (seen.has(id)) return { ok: false, error: { key: 'err_duplicate_id', id } }
    seen.add(id)
    requirements.push({
      id,
      order: r.order,
      title_en: r.title_en.trim(),
      title_bn: isText(r.title_bn) ? r.title_bn.trim() : r.title_en.trim(),
      mandatory: r.mandatory,
      has_expiry: r.has_expiry,
    })
  }

  requirements.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

  const tender: Tender = {
    tender_id: (t.tender_id as string).trim(),
    title: (t.title as string).trim(),
    procuring_entity: (t.procuring_entity as string).trim(),
    bidder: (t.bidder as string).trim(),
    submission_deadline: deadline,
  }
  for (const f of ['title_bn', 'procuring_entity_bn', 'bidder_bn'] as const) {
    if (isText(t[f])) tender[f] = (t[f] as string).trim()
  }
  return { ok: true, tender, requirements }
}
