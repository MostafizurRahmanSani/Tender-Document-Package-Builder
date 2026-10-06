// Saving and reopening work: a project file you can download, and an automatic copy kept in this browser.
// Nothing is sent anywhere. Both hold the PDFs themselves, so the work can be resumed exactly.
import type { MatchState, Requirement, Tender, UploadedFile } from './types'
import { parseRequirements } from './logic/requirements'
import { isPng, DEFAULT_SEAL, type SealSettings } from './logic/seal'
import { isValidISODate } from './logic/dates'
import type { TenderBn } from './ai'

export interface ProjectSeal {
  name: string
  bytes: ArrayBuffer
  width: number
  height: number
}

export interface ProjectData {
  savedAt: number // ms since 1970
  tender: Tender
  requirements: Requirement[]
  files: UploadedFile[] // only ready files, with their bytes
  match: MatchState
  withIndex: boolean
  seal: ProjectSeal | null
  sealSettings: SealSettings
  tenderBn?: TenderBn | null // Bangla tender details made with AI help
}

// ---- base64 for the project file (JSON cannot hold raw bytes) ----
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(out)
}

function fromBase64(s: string): ArrayBuffer {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

const FORMAT = 'tender-package-project'

export function projectToJson(p: ProjectData): string {
  return JSON.stringify({
    format: FORMAT,
    version: 1,
    savedAt: p.savedAt,
    tender: p.tender,
    requirements: p.requirements,
    files: p.files.map((f) => ({ id: f.id, name: f.name, size: f.size, pages: f.pages, hash: f.hash, data: toBase64(f.bytes!) })),
    match: p.match,
    withIndex: p.withIndex,
    seal: p.seal && { name: p.seal.name, width: p.seal.width, height: p.seal.height, data: toBase64(p.seal.bytes) },
    sealSettings: p.sealSettings,
    tenderBn: p.tenderBn ?? null,
  })
}

export type ProjectError = 'project_bad' | 'project_version'

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown) => (typeof v === 'string' ? v : '')

// Reads a project file. Anything unexpected becomes a clear error, never a crash.
export function jsonToProject(raw: string): { ok: true; project: ProjectData } | { ok: false; error: ProjectError } {
  let d: unknown
  try {
    d = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'project_bad' }
  }
  if (!isObj(d) || d.format !== FORMAT) return { ok: false, error: 'project_bad' }
  if (d.version !== 1) return { ok: false, error: 'project_version' }

  // The tender and the list go through the same checks as a requirements.json file.
  const parsed = parseRequirements(JSON.stringify({ tender: d.tender, requirements: d.requirements }))
  if (!parsed.ok) return { ok: false, error: 'project_bad' }

  const files: UploadedFile[] = []
  try {
    for (const f of Array.isArray(d.files) ? d.files : []) {
      if (!isObj(f) || !text(f.id) || !text(f.data)) continue
      const bytes = fromBase64(text(f.data))
      if (!isPdfStart(bytes)) continue
      files.push({
        id: text(f.id),
        name: text(f.name) || 'file.pdf',
        size: bytes.byteLength,
        pages: Number(f.pages) || 1,
        hash: text(f.hash),
        bytes,
        state: 'ready',
      })
    }
  } catch {
    return { ok: false, error: 'project_bad' }
  }

  let seal: ProjectSeal | null = null
  if (isObj(d.seal) && text(d.seal.data)) {
    try {
      const bytes = fromBase64(text(d.seal.data))
      if (isPng(new Uint8Array(bytes, 0, 8))) seal = { name: text(d.seal.name) || 'seal.png', bytes, width: Number(d.seal.width) || 1, height: Number(d.seal.height) || 1 }
    } catch {
      seal = null
    }
  }

  return {
    ok: true,
    project: {
      savedAt: Number(d.savedAt) || Date.now(),
      tender: parsed.tender,
      requirements: parsed.requirements,
      files,
      match: cleanMatch(d.match, files, parsed.requirements),
      withIndex: d.withIndex === true,
      seal,
      sealSettings: cleanSettings(d.sealSettings),
      tenderBn: cleanTenderBn(d.tenderBn),
    },
  }
}

function isPdfStart(b: ArrayBuffer): boolean {
  const h = new Uint8Array(b, 0, Math.min(5, b.byteLength))
  return [0x25, 0x50, 0x44, 0x46, 0x2d].every((x, i) => h[i] === x)
}

// Keeps only matches that still make sense: a known requirement, a loaded file, one file per requirement.
export function cleanMatch(raw: unknown, files: UploadedFile[], reqs: Requirement[]): MatchState {
  const out: MatchState = { matches: {}, expiry: {} }
  if (!isObj(raw)) return out
  const m = isObj(raw.matches) ? raw.matches : {}
  const e = isObj(raw.expiry) ? raw.expiry : {}
  const ids = new Set(files.map((f) => f.id))
  const used = new Set<string>()
  for (const r of reqs) {
    const fid = text(m[r.id])
    if (!fid || !ids.has(fid) || used.has(fid)) continue
    used.add(fid)
    out.matches[r.id] = fid
    const date = text(e[r.id])
    if (r.has_expiry && isValidISODate(date)) out.expiry[r.id] = date
  }
  return out
}

function cleanTenderBn(raw: unknown): TenderBn | null {
  if (!isObj(raw)) return null
  const t = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 300) : undefined)
  const out = { title: t(raw.title), procuring_entity: t(raw.procuring_entity), bidder: t(raw.bidder) }
  return out.title || out.procuring_entity || out.bidder ? out : null
}

function cleanSettings(raw: unknown): SealSettings {
  if (!isObj(raw)) return DEFAULT_SEAL
  const modes = ['last', 'first', 'all', 'custom']
  const positions = ['bottom-right', 'bottom-center', 'bottom-left', 'top-right', 'top-left', 'center']
  const w = Number(raw.widthPct)
  return {
    mode: modes.includes(text(raw.mode)) ? (text(raw.mode) as SealSettings['mode']) : DEFAULT_SEAL.mode,
    custom: text(raw.custom).slice(0, 200),
    position: positions.includes(text(raw.position)) ? (text(raw.position) as SealSettings['position']) : DEFAULT_SEAL.position,
    widthPct: Number.isFinite(w) ? Math.min(45, Math.max(8, w)) : DEFAULT_SEAL.widthPct,
  }
}

// ---- Automatic copy in this browser (IndexedDB) ----
const DB = 'tender-package-builder'
const STORE = 'kv'
const KEY = 'session'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

// Storage can be blocked (private window, no space): every call fails quietly.
export async function saveSession(p: ProjectData): Promise<void> {
  try {
    await run('readwrite', (s) => s.put(p, KEY))
  } catch {
    /* the app still works, it just cannot resume later */
  }
}

export async function loadSession(): Promise<ProjectData | null> {
  try {
    const v = (await run('readonly', (s) => s.get(KEY))) as ProjectData | undefined
    return v && v.tender && Array.isArray(v.files) ? v : null
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(KEY))
  } catch {
    /* nothing to clear */
  }
}
