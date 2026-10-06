import { PDFDocument, PDFFont, PDFPage, StandardFonts, degrees, rgb } from 'pdf-lib'
import type { Tender } from '../types'

export interface PackageItem {
  order: number
  title: string // English title, the cover is always in English
  bytes: ArrayBuffer
}

export interface PackageResult {
  bytes: Uint8Array
  totalPages: number
  starts: number[] // page where each item starts (1-based)
}

// Height of the strip added under every document page for the footer.
// The original page sits above it, so the footer never covers content (rule 6.4).
export const FOOTER_BAND = 28

const A4 = { w: 595.28, h: 841.89 }
const INK = rgb(0.06, 0.09, 0.16)
const MUTED = rgb(0.28, 0.33, 0.41)
const LINE = rgb(0.85, 0.87, 0.91)
const ACCENT = rgb(0.17, 0.31, 0.85)

// Standard PDF fonts only know Latin characters; anything else becomes "?" instead of crashing.
function safe(font: PDFFont, text: string): string {
  const known = new Set(font.getCharacterSet())
  return Array.from(text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'))
    .map((ch) => (known.has(ch.codePointAt(0)!) ? ch : '?'))
    .join('')
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of safe(font, text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

function fit(font: PDFFont, text: string, size: number, maxWidth: number): string {
  let s = safe(font, text)
  if (font.widthOfTextAtSize(s, size) <= maxWidth) return s
  while (s.length > 1 && font.widthOfTextAtSize(s + '...', size) > maxWidth) s = s.slice(0, -1)
  return s + '...'
}

interface Fonts {
  regular: PDFFont
  bold: PDFFont
}

function drawCover(page: PDFPage, f: Fonts, tender: Tender, madeOn: string, items: PackageItem[], pageCounts: number[]) {
  const left = 56
  const width = A4.w - left * 2
  page.drawRectangle({ x: 0, y: A4.h - 8, width: A4.w, height: 8, color: ACCENT })

  let y = A4.h - 72
  page.drawText('TENDER SUBMISSION PACKAGE', { x: left, y, size: 10, font: f.bold, color: ACCENT })
  y -= 34
  for (const line of wrap(f.bold, tender.title, 24, width)) {
    page.drawText(line, { x: left, y, size: 24, font: f.bold, color: INK })
    y -= 30
  }
  y -= 10

  const rows: Array<[string, string]> = [
    ['Tender ID', tender.tender_id],
    ['Tender title', tender.title],
    ['Procuring entity', tender.procuring_entity],
    ['Bidder', tender.bidder],
    ['Submission deadline', tender.submission_deadline],
    ['Package created', madeOn],
  ]
  const valueX = left + 140
  for (const [label, value] of rows) {
    page.drawLine({ start: { x: left, y: y + 14 }, end: { x: left + width, y: y + 14 }, thickness: 0.6, color: LINE })
    page.drawText(label, { x: left, y, size: 10, font: f.regular, color: MUTED })
    const lines = wrap(f.bold, value, 11, width - 140)
    lines.forEach((l, i) => page.drawText(l, { x: valueX, y: y - i * 14, size: 11, font: f.bold, color: INK }))
    y -= 14 * lines.length + 12
  }
  page.drawLine({ start: { x: left, y: y + 14 }, end: { x: left + width, y: y + 14 }, thickness: 0.6, color: LINE })

  y -= 26
  page.drawText(`Included documents (${items.length})`, { x: left, y, size: 13, font: f.bold, color: INK })
  y -= 24

  // Shrink rows if a large tender would not fit on one page.
  const bottom = FOOTER_BAND + 40
  const rowH = Math.min(22, (y - bottom) / Math.max(items.length + 1, 1))
  const size = Math.max(6.5, Math.min(10.5, rowH * 0.55))
  const pagesX = left + width - 40
  page.drawText('No.', { x: left, y, size: size - 1, font: f.bold, color: MUTED })
  page.drawText('Document', { x: left + 36, y, size: size - 1, font: f.bold, color: MUTED })
  page.drawText('Pages', { x: pagesX, y, size: size - 1, font: f.bold, color: MUTED })
  y -= rowH
  items.forEach((it, i) => {
    page.drawText(String(i + 1), { x: left, y, size, font: f.regular, color: MUTED })
    page.drawText(fit(f.regular, it.title, size, pagesX - left - 48), { x: left + 36, y, size, font: f.regular, color: INK })
    page.drawText(String(pageCounts[i]), { x: pagesX, y, size, font: f.regular, color: INK })
    page.drawLine({ start: { x: left, y: y - rowH * 0.35 }, end: { x: left + width, y: y - rowH * 0.35 }, thickness: 0.4, color: LINE })
    y -= rowH
  })
}

function drawIndex(page: PDFPage, f: Fonts, items: PackageItem[], starts: number[]) {
  const left = 56
  const width = A4.w - left * 2
  page.drawRectangle({ x: 0, y: A4.h - 8, width: A4.w, height: 8, color: ACCENT })
  let y = A4.h - 80
  page.drawText('Index', { x: left, y, size: 22, font: f.bold, color: INK })
  y -= 36
  const bottom = FOOTER_BAND + 40
  const rowH = Math.min(24, (y - bottom) / Math.max(items.length + 1, 1))
  const size = Math.max(6.5, Math.min(11, rowH * 0.5))
  const pageX = left + width - 50
  page.drawText('Document', { x: left, y, size: size - 1, font: f.bold, color: MUTED })
  page.drawText('Starts on', { x: pageX, y, size: size - 1, font: f.bold, color: MUTED })
  y -= rowH
  items.forEach((it, i) => {
    const title = fit(f.regular, `${i + 1}.  ${it.title}`, size, pageX - left - 20)
    page.drawText(title, { x: left, y, size, font: f.regular, color: INK })
    page.drawText(`Page ${starts[i]}`, { x: pageX, y, size, font: f.bold, color: INK })
    page.drawLine({ start: { x: left, y: y - rowH * 0.35 }, end: { x: left + width, y: y - rowH * 0.35 }, thickness: 0.4, color: LINE })
    y -= rowH
  })
}

// Places an embedded page on a taller page, keeping its original rotation.
function placeWithBand(out: PDFDocument, embedded: Awaited<ReturnType<PDFDocument['embedPage']>>, rotation: number) {
  const w = embedded.width
  const h = embedded.height
  const turned = rotation === 90 || rotation === 270
  const W = turned ? h : w
  const H = turned ? w : h
  const page = out.addPage([W, H + FOOTER_BAND])
  const B = FOOTER_BAND
  // PDF rotation is clockwise; drawPage rotates counter-clockwise around (x, y).
  if (rotation === 90) page.drawPage(embedded, { x: 0, y: B + H, rotate: degrees(-90) })
  else if (rotation === 180) page.drawPage(embedded, { x: W, y: B + H, rotate: degrees(180) })
  else if (rotation === 270) page.drawPage(embedded, { x: W, y: B, rotate: degrees(90) })
  else page.drawPage(embedded, { x: 0, y: B })
}

// Builds the final package: cover, optional index, then every document in order,
// with "<tender_id> | Page X of Y" at the bottom of every page.
export async function buildPackage(
  tender: Tender,
  items: PackageItem[],
  madeOn: string,
  withIndex = false,
): Promise<PackageResult> {
  const out = await PDFDocument.create()
  out.setTitle(`${tender.tender_id} Package`)
  out.setSubject(tender.title)
  out.setProducer('Tender Package Builder')
  const fonts: Fonts = {
    regular: await out.embedFont(StandardFonts.Helvetica),
    bold: await out.embedFont(StandardFonts.HelveticaBold),
  }

  const sources = await Promise.all(items.map((it) => PDFDocument.load(it.bytes, { updateMetadata: false })))
  const pageCounts = sources.map((s) => s.getPageCount())

  const front = withIndex ? 2 : 1
  const starts: number[] = []
  let next = front + 1
  for (const n of pageCounts) {
    starts.push(next)
    next += n
  }

  drawCover(out.addPage([A4.w, A4.h]), fonts, tender, madeOn, items, pageCounts)
  if (withIndex) drawIndex(out.addPage([A4.w, A4.h]), fonts, items, starts)

  for (const src of sources) {
    const pages = src.getPages()
    const boxes = pages.map((p) => {
      const c = p.getCropBox()
      return { left: c.x, bottom: c.y, right: c.x + c.width, top: c.y + c.height }
    })
    for (const [i, p] of pages.entries()) {
      const angle = ((p.getRotation().angle % 360) + 360) % 360
      if (p.node.Contents()) {
        placeWithBand(out, await out.embedPage(p, boxes[i]), angle)
      } else {
        // A blank page has no content to embed: add an empty page of the same size.
        const { width, height } = p.getSize()
        const turned = angle === 90 || angle === 270
        out.addPage([turned ? height : width, (turned ? width : height) + FOOTER_BAND])
      }
    }
  }

  // Footer pass: the total is only known once every page exists.
  const all = out.getPages()
  const total = all.length
  const size = 9
  all.forEach((page, i) => {
    const { width } = page.getSize()
    const text = safe(fonts.regular, `${tender.tender_id} | Page ${i + 1} of ${total}`)
    const tw = fonts.regular.widthOfTextAtSize(text, size)
    page.drawText(text, { x: (width - tw) / 2, y: (FOOTER_BAND - size) / 2 + 1, size, font: fonts.regular, color: INK })
  })

  return { bytes: await out.save(), totalPages: total, starts }
}
