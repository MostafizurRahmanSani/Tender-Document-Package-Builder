import { describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, degrees } from 'pdf-lib'
import { buildPackage, FOOTER_BAND } from './buildPackage'
import { readPdf } from './readPdf'
import { parseRequirements } from '../logic/requirements'
import { sealTargets, parsePageSpec, sealOrigin } from '../logic/seal'
import { deflateSync } from 'node:zlib'

// A tiny valid 2x1 PNG made on the fly (no files needed).
function tinyPng(): ArrayBuffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.from([0, 255, 0, 0, 255, 0, 0, 255, 255])
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer
}

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

describe('seal helpers', () => {
  it('parses page lists and reports bad parts', () => {
    expect(parsePageSpec('1, 3-5; 5', 10)).toEqual({ pages: [1, 3, 4, 5], invalid: [] })
    expect(parsePageSpec('0 2-1 11 x', 10).invalid).toEqual(['0', '2-1', '11', 'x'])
  })
  it('first / last / all pages of each document', () => {
    const starts = [2, 4], counts = [2, 3]
    expect(sealTargets({ mode: 'last', custom: '' }, starts, counts, 6).pages).toEqual([3, 6])
    expect(sealTargets({ mode: 'first', custom: '' }, starts, counts, 6).pages).toEqual([2, 4])
    expect(sealTargets({ mode: 'all', custom: '' }, starts, counts, 6).pages).toEqual([2, 3, 4, 5, 6])
  })
  it('keeps the seal above the footer strip and inside the page', () => {
    const o = sealOrigin('bottom-right', 600, 800, 100, 50, 28)
    expect(o.y).toBeGreaterThanOrEqual(28)
    expect(o.x + 100).toBeLessThanOrEqual(600)
    expect(sealOrigin('top-left', 600, 800, 100, 50, 28).y + 50).toBeLessThanOrEqual(800)
  })
})

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
    const r = await buildPackage(tender, [{ order: 1, title: 'A', bytes: await makePdf(1) }], '2026-10-06', { withIndex: true })
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
  it('draws the Bangla index names through the renderer, and still works if it fails', async () => {
    const png = new Uint8Array(tinyPng())
    const calls: string[] = []
    const renderBangla = async (text: string) => (calls.push(text), { bytes: png, widthPt: 80, heightPt: 14, descentPt: 3 })
    const items = [
      { order: 1, title: 'Trade License', titleBn: 'ট্রেড লাইসেন্স', bytes: await makePdf(1) },
      { order: 2, title: 'Same', titleBn: 'Same', bytes: await makePdf(1) }, // same as English: no second line
    ]
    const r = await buildPackage(tender, items, '2026-10-06', { withIndex: true, renderBangla })
    expect(r.totalPages).toBe(4)
    expect(calls).toEqual(['নথির নাম', 'ট্রেড লাইসেন্স'])
    const failing = await buildPackage(tender, items, '2026-10-06', { withIndex: true, renderBangla: async () => null })
    expect(failing.totalPages).toBe(4)
  })
  it('places a seal on the chosen pages only', async () => {
    const seal = { bytes: tinyPng(), settings: { mode: 'custom' as const, custom: '2, 4-5, 99', position: 'bottom-right' as const, widthPct: 20 } }
    const r = await buildPackage(tender, [
      { order: 1, title: 'A', bytes: await makePdf(2) },
      { order: 2, title: 'B', bytes: await makePdf(2) },
    ], '2026-10-06', { seal })
    expect(r.sealedPages).toEqual([2, 4, 5])
    expect(r.sealInvalid).toEqual(['99'])
    expect((await PDFDocument.load(r.bytes)).getPageCount()).toBe(5)
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
