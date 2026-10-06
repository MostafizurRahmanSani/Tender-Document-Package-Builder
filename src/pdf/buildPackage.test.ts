import { describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, degrees } from 'pdf-lib'
import { buildPackage, FOOTER_BAND } from './buildPackage'
import { readPdf } from './readPdf'
import { parseRequirements } from '../logic/requirements'

const tender = { tender_id: 'T-9', title: 'Test', procuring_entity: 'P', bidder: 'B', submission_deadline: '2026-10-20' }

async function makePdf(pages: number, rotate = 0, blank = false) {
  const d = await PDFDocument.create()
  for (let i = 0; i < pages; i++) {
    const p = d.addPage([600, 800])
    p.setRotation(degrees(rotate))
    if (!blank) p.drawRectangle({ x: 50, y: 50, width: 100, height: 100 })
  }
  const b = await d.save()
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}

describe('buildPackage (Section 6)', () => {
  it('cover first, all pages in order, total count, footer band', async () => {
    const r = await buildPackage(tender, [
      { order: 1, title: 'A', bytes: await makePdf(2) },
      { order: 2, title: 'B', bytes: await makePdf(3) },
    ], '2026-10-06')
    expect(r.totalPages).toBe(6)
    expect(r.starts).toEqual([2, 4])
    const out = await PDFDocument.load(r.bytes)
    expect(out.getPageCount()).toBe(6)
    expect(out.getPage(1).getSize()).toEqual({ width: 600, height: 800 + FOOTER_BAND })
  })
  it('index page shifts starts by one', async () => {
    const r = await buildPackage(tender, [{ order: 1, title: 'A', bytes: await makePdf(1) }], '2026-10-06', true)
    expect(r.totalPages).toBe(3)
    expect(r.starts).toEqual([3])
  })
  it('keeps rotated pages upright (landscape stays landscape)', async () => {
    const r = await buildPackage(tender, [{ order: 1, title: 'A', bytes: await makePdf(1, 90) }], '2026-10-06')
    const out = await PDFDocument.load(r.bytes)
    expect(out.getPage(1).getSize()).toEqual({ width: 800, height: 600 + FOOTER_BAND })
  })
  it('copes with blank pages that have no content', async () => {
    const r = await buildPackage(tender, [{ order: 1, title: 'A', bytes: await makePdf(2, 0, true) }], '2026-10-06')
    expect(r.totalPages).toBe(3)
    expect((await PDFDocument.load(r.bytes)).getPageCount()).toBe(3)
  })
  it('reports damaged files instead of throwing', async () => {
    expect(await readPdf(new TextEncoder().encode('%PDF-1.4 garbage').buffer as ArrayBuffer)).toEqual({ error: 'damaged' })
  })
})

// End-to-end on the organizers' sample pack (skipped if the pack is not next to the repo).
const PACK = join(__dirname, '../../../Problem Info/sample-pack')
describe.skipIf(!existsSync(PACK))('sample pack', () => {
  it('builds the 16-page package', async () => {
    const parsed = parseRequirements(readFileSync(join(PACK, 'requirements.json'), 'utf8'))
    if (!parsed.ok) throw new Error('bad requirements')
    const chosen: Record<string, string> = {
      R01: 'trade_license_2026.pdf', R02: '03_tin_certificate.pdf', R03: '04_vat_certificate.pdf', R04: 'bank_solvency.pdf',
      R05: 'experience_cert.pdf', R08: '02_technical_proposal.pdf', R09: '01_financial_proposal.pdf', R10: 'scan_0042.pdf',
    }
    const items = parsed.requirements.filter((r) => chosen[r.id]).map((r) => {
      const b = readFileSync(join(PACK, 'documents', chosen[r.id]))
      return { order: r.order, title: r.title_en, bytes: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer }
    })
    const r = await buildPackage(parsed.tender, items, '2026-10-06')
    expect(r.totalPages).toBe(16)
    if (process.env.WRITE_OUTPUT) {
      mkdirSync(join(__dirname, '../../output'), { recursive: true })
      writeFileSync(join(__dirname, `../../output/${parsed.tender.tender_id}_Package.pdf`), r.bytes)
    }
  })
})
