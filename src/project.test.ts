import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { cleanMatch, jsonToProject, projectToJson, type ProjectData } from './project'
import { DEFAULT_SEAL } from './logic/seal'
import type { Requirement, UploadedFile } from './types'

const tender = { tender_id: 'T-1', title: 'Test', procuring_entity: 'P', bidder: 'B', submission_deadline: '2026-10-20' }
const reqs: Requirement[] = [
  { id: 'R1', order: 1, title_en: 'One', title_bn: 'এক', mandatory: true, has_expiry: true },
  { id: 'R2', order: 2, title_en: 'Two', title_bn: 'দুই', mandatory: false, has_expiry: false },
]

async function pdfBytes(): Promise<ArrayBuffer> {
  const d = await PDFDocument.create()
  d.addPage([200, 200])
  const b = await d.save()
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}

const file = (id: string, bytes: ArrayBuffer): UploadedFile => ({ id, name: id + '.pdf', size: bytes.byteLength, pages: 1, hash: 'h' + id, bytes, state: 'ready' })

describe('project file', () => {
  it('round-trips files, matches, expiry dates and settings', async () => {
    const a = await pdfBytes()
    const p: ProjectData = {
      savedAt: 1234,
      tender,
      requirements: reqs,
      files: [file('f1', a), file('f2', a)],
      match: { matches: { R1: 'f1' }, expiry: { R1: '2027-01-01' } },
      withIndex: true,
      seal: null,
      sealSettings: { ...DEFAULT_SEAL, mode: 'custom', custom: '2, 3' },
    }
    const r = jsonToProject(projectToJson(p))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.project.files.map((f) => f.id)).toEqual(['f1', 'f2'])
    expect(new Uint8Array(r.project.files[0].bytes!)).toEqual(new Uint8Array(a))
    expect(r.project.match).toEqual({ matches: { R1: 'f1' }, expiry: { R1: '2027-01-01' } })
    expect(r.project.withIndex).toBe(true)
    expect(r.project.sealSettings).toMatchObject({ mode: 'custom', custom: '2, 3' })
    expect(r.project.requirements.map((x) => x.id)).toEqual(['R1', 'R2'])
  })

  it('rejects files that are not project files, with a clear error', () => {
    expect(jsonToProject('{oops')).toEqual({ ok: false, error: 'project_bad' })
    expect(jsonToProject('{"tender":{}}')).toEqual({ ok: false, error: 'project_bad' })
    expect(jsonToProject(JSON.stringify({ format: 'tender-package-project', version: 9 }))).toEqual({ ok: false, error: 'project_version' })
    // a requirements.json by mistake
    expect(jsonToProject(JSON.stringify({ tender, requirements: reqs })).ok).toBe(false)
  })

  it('drops files that are not PDFs and matches that point at nothing', async () => {
    const good = await pdfBytes()
    const raw = JSON.parse(projectToJson({
      savedAt: 1, tender, requirements: reqs, files: [file('ok', good)], match: { matches: {}, expiry: {} }, withIndex: false, seal: null, sealSettings: DEFAULT_SEAL,
    }))
    raw.files.push({ id: 'bad', name: 'x.pdf', size: 3, pages: 1, hash: 'x', data: btoa('not a pdf') })
    raw.match = { matches: { R1: 'bad', R2: 'ghost' }, expiry: {} }
    const r = jsonToProject(JSON.stringify(raw))
    expect(r.ok && r.project.files.map((f) => f.id)).toEqual(['ok'])
    expect(r.ok && r.project.match.matches).toEqual({})
  })
})

describe('cleanMatch', () => {
  const files = [file('a', new ArrayBuffer(1)), file('b', new ArrayBuffer(1))]
  it('keeps one file per requirement and only valid expiry dates on documents that expire', () => {
    const m = cleanMatch(
      { matches: { R1: 'a', R2: 'a' }, expiry: { R1: '2027-02-30', R2: '2027-01-01' } },
      files,
      reqs,
    )
    expect(m.matches).toEqual({ R1: 'a' }) // R2 would reuse file a
    expect(m.expiry).toEqual({}) // 30 February is not a date
    expect(cleanMatch({ matches: { R1: 'b' }, expiry: { R1: '2027-01-01' } }, files, reqs).expiry).toEqual({ R1: '2027-01-01' })
    expect(cleanMatch(null, files, reqs)).toEqual({ matches: {}, expiry: {} })
  })
})
