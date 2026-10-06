// Seal / signature placement helpers (pure, so they are easy to test).

export type SealMode = 'last' | 'first' | 'all' | 'custom'
export type SealPosition = 'bottom-right' | 'bottom-center' | 'bottom-left' | 'top-right' | 'top-left' | 'center'

export const SEAL_POSITIONS: SealPosition[] = ['bottom-right', 'bottom-center', 'bottom-left', 'top-right', 'top-left', 'center']

export interface SealSettings {
  mode: SealMode
  custom: string // e.g. "3, 5-7" (page numbers in the final package)
  position: SealPosition
  widthPct: number // seal width as a percent of the page width
}

export const DEFAULT_SEAL: SealSettings = { mode: 'last', custom: '', position: 'bottom-right', widthPct: 22 }

export const isPng = (head: Uint8Array) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => head[i] === b)

// Reads "3, 5-7" into page numbers. Anything outside 1..total, or not understood, is reported back.
export function parsePageSpec(spec: string, total: number): { pages: number[]; invalid: string[] } {
  const pages = new Set<number>()
  const invalid: string[] = []
  for (const part of spec.split(/[,\s;]+/).filter(Boolean)) {
    const m = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(part)
    if (!m) {
      invalid.push(part)
      continue
    }
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    if (a < 1 || b < a || b > total) {
      invalid.push(part)
      continue
    }
    for (let p = a; p <= b; p++) pages.add(p)
  }
  return { pages: [...pages].sort((x, y) => x - y), invalid }
}

// Package page numbers (1 = cover) that get the seal.
export function sealTargets(
  s: Pick<SealSettings, 'mode' | 'custom'>,
  starts: number[], // page where each document starts
  counts: number[], // pages in each document
  total: number,
): { pages: number[]; invalid: string[] } {
  if (s.mode === 'custom') return parsePageSpec(s.custom, total)
  const pages: number[] = []
  starts.forEach((start, i) => {
    if (s.mode === 'first') pages.push(start)
    else if (s.mode === 'last') pages.push(start + counts[i] - 1)
    else for (let p = start; p < start + counts[i]; p++) pages.push(p)
  })
  return { pages, invalid: [] }
}

// Lower-left corner of the seal on a page of size w x h. `bottomInset` keeps it above the footer strip.
export function sealOrigin(
  position: SealPosition,
  w: number,
  h: number,
  sw: number,
  sh: number,
  bottomInset: number,
  margin = 28,
): { x: number; y: number } {
  const left = margin
  const right = w - margin - sw
  const center = (w - sw) / 2
  const bottom = bottomInset + margin
  const top = h - margin - sh
  switch (position) {
    case 'bottom-right':
      return { x: right, y: bottom }
    case 'bottom-center':
      return { x: center, y: bottom }
    case 'bottom-left':
      return { x: left, y: bottom }
    case 'top-right':
      return { x: right, y: top }
    case 'top-left':
      return { x: left, y: top }
    case 'center':
      return { x: center, y: (h + bottomInset - sh) / 2 }
  }
}
