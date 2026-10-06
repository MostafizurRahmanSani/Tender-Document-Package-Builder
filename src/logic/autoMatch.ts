import type { Requirement, UploadedFile } from '../types'

// Words that appear in many document names and tell us nothing.
const STOP = new Set(['certificate', 'cert', 'certificates', 'the', 'of', 'and', 'signed', 'copy', 'final', 'scan', 'doc', 'document', 'pdf', 'registration'])

const SYNONYMS: Record<string, string> = {
  licence: 'license',
  declaration: 'declaration',
  authorisation: 'authorization',
  auth: 'authorization',
  manufacturers: 'manufacturer',
  tech: 'technical',
  fin: 'financial',
  statements: 'statement',
}

export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\.pdf$/, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !/^\d+$/.test(w) && !STOP.has(w))
    .map((w) => SYNONYMS[w] ?? w.replace(/'s$/, ''))
}

// Latest year in a file name, used to prefer the newest version (e.g. 2026 over 2025).
// Only years count, so "file (1).pdf" never beats "file.pdf".
const newest = (name: string) => Math.max(0, ...(name.match(/(?:19|20)\d{2}/g) ?? []).map(Number))

// Names like "file (1).pdf" or "file - Copy.pdf" are usually extra copies; prefer the original.
const looksLikeCopy = (name: string) => (/\(\d+\)|copy/i.test(name) ? 1 : 0)

// Suggests requirement -> file pairs by comparing words in names.
// Best scores are taken first; each file and each requirement is used once.
export function suggestMatches(
  requirements: Requirement[],
  files: UploadedFile[],
  taken: { reqs: Set<string>; files: Set<string> },
): Array<[string, string]> {
  const pairs: Array<{ req: string; file: string; score: number; tie: number; copy: number }> = []
  for (const r of requirements) {
    if (taken.reqs.has(r.id)) continue
    const rt = new Set(tokens(r.title_en))
    for (const f of files) {
      if (taken.files.has(f.id) || f.state !== 'ready') continue
      const ft = tokens(f.name)
      const shared = ft.filter((w) => rt.has(w)).length
      if (shared === 0) continue
      // Share of the requirement's words found in the file name.
      pairs.push({ req: r.id, file: f.id, score: shared / rt.size + shared * 0.01, tie: newest(f.name), copy: looksLikeCopy(f.name) })
    }
  }
  pairs.sort((a, b) => b.score - a.score || b.tie - a.tie || a.copy - b.copy)

  const usedR = new Set(taken.reqs)
  const usedF = new Set(taken.files)
  const out: Array<[string, string]> = []
  for (const p of pairs) {
    if (usedR.has(p.req) || usedF.has(p.file)) continue
    usedR.add(p.req)
    usedF.add(p.file)
    out.push([p.req, p.file])
  }
  return out
}
