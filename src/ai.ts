// Optional AI help, using the user's own API key. Nothing here is needed for the main workflow.
// Privacy: only document titles and file names are sent, never the contents of any PDF.
import type { Requirement, UploadedFile } from './types'

export type Provider = 'groq' | 'openrouter'

export const PROVIDERS: Record<Provider, { label: string; url: string; model: string }> = {
  groq: { label: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
  openrouter: { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4o-mini' },
}

export interface AiSettings {
  provider: Provider
  model: string
  key: string // never saved anywhere except this tab's session storage
}

export type AiErrorCode = 'no_key' | 'auth' | 'rate' | 'network' | 'timeout' | 'bad_response' | 'http'

export class AiError extends Error {
  constructor(public code: AiErrorCode) {
    super(code)
  }
}

type FetchLike = typeof fetch

// One chat request. Every failure becomes an AiError with a code the UI can explain.
async function chat(s: AiSettings, system: string, user: string, fetchImpl: FetchLike = fetch): Promise<string> {
  if (!s.key.trim()) throw new AiError('no_key')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 40_000)
  let res: Response
  try {
    res = await fetchImpl(PROVIDERS[s.provider].url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.key.trim()}` },
      body: JSON.stringify({
        model: s.model.trim() || PROVIDERS[s.provider].model,
        temperature: 0,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
  } catch (e) {
    throw new AiError((e as Error)?.name === 'AbortError' ? 'timeout' : 'network')
  } finally {
    clearTimeout(timer)
  }
  if (res.status === 401 || res.status === 403) throw new AiError('auth')
  if (res.status === 429) throw new AiError('rate')
  if (!res.ok) throw new AiError('http')
  try {
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) throw new Error('empty')
    return content
  } catch {
    throw new AiError('bad_response')
  }
}

// Models sometimes wrap JSON in text or code fences; take the outermost {...}.
export function extractJson(text: string): unknown {
  const a = text.indexOf('{')
  const b = text.lastIndexOf('}')
  if (a < 0 || b <= a) throw new AiError('bad_response')
  try {
    return JSON.parse(text.slice(a, b + 1))
  } catch {
    throw new AiError('bad_response')
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// ---- Suggest matches ------------------------------------------------------------------------
// Sends requirement titles and file names only. Short ids (F1, F2...) stand in for files.
export async function suggestMatchesAI(
  s: AiSettings,
  requirements: Requirement[],
  files: UploadedFile[],
  taken: { reqs: Set<string>; files: Set<string> },
  fetchImpl: FetchLike = fetch,
): Promise<Array<[string, string]>> {
  const openReqs = requirements.filter((r) => !taken.reqs.has(r.id))
  const openFiles = files.filter((f) => f.state === 'ready' && !taken.files.has(f.id))
  if (!openReqs.length || !openFiles.length) return []
  const short = new Map(openFiles.map((f, i) => [`F${i + 1}`, f.id]))

  const text = await chat(
    s,
    'You match tender documents to uploaded file names. Reply with JSON only, in this shape: ' +
      '{"matches":[{"requirement":"<requirement id>","file":"<file id>"}]}. ' +
      'Use each requirement and each file at most once. Only include a pair when the file name clearly fits that document. ' +
      'Never invent ids. If nothing fits, return {"matches":[]}.',
    JSON.stringify({
      requirements: openReqs.map((r) => ({ id: r.id, title: r.title_en, mandatory: r.mandatory })),
      files: [...short].map(([id, realId]) => ({ id, name: openFiles.find((f) => f.id === realId)!.name })),
    }),
    fetchImpl,
  )

  const data = extractJson(text)
  const list = isObj(data) && Array.isArray(data.matches) ? data.matches : null
  if (!list) throw new AiError('bad_response')

  const reqIds = new Set(openReqs.map((r) => r.id))
  const usedR = new Set<string>()
  const usedF = new Set<string>()
  const out: Array<[string, string]> = []
  for (const m of list) {
    if (!isObj(m)) continue
    const r = String(m.requirement ?? '')
    const f = short.get(String(m.file ?? ''))
    // Ignore anything the model made up, or that would reuse a document or a file.
    if (!reqIds.has(r) || !f || usedR.has(r) || usedF.has(f)) continue
    usedR.add(r)
    usedF.add(f)
    out.push([r, f])
  }
  return out
}

// ---- Translate the tender details into Bangla ---------------------------------------------------
export interface TenderBn {
  title?: string
  procuring_entity?: string
  bidder?: string
}

export async function translateTenderAI(
  s: AiSettings,
  tender: { title: string; procuring_entity: string; bidder: string },
  fetchImpl: FetchLike = fetch,
): Promise<TenderBn> {
  const text = await chat(
    s,
    'Translate these tender details into natural Bangla (Bengali script). Keep numbers and codes unchanged. ' +
      'Transliterate company and organisation names rather than translating them word by word. ' +
      'Reply with JSON only: {"title":"...","procuring_entity":"...","bidder":"..."}.',
    JSON.stringify({ title: tender.title, procuring_entity: tender.procuring_entity, bidder: tender.bidder }),
    fetchImpl,
  )
  const d = extractJson(text)
  if (!isObj(d)) throw new AiError('bad_response')
  const clean = (v: unknown) => (typeof v === 'string' && /[ঀ-৿]/.test(v) ? v.trim() : undefined) // must really be Bangla
  const out: TenderBn = { title: clean(d.title), procuring_entity: clean(d.procuring_entity), bidder: clean(d.bidder) }
  if (!out.title && !out.procuring_entity && !out.bidder) throw new AiError('bad_response')
  return out
}
