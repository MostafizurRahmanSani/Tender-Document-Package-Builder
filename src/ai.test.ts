import { describe, expect, it } from 'vitest'
import { AiError, extractJson, suggestMatchesAI, translateTenderAI, type AiSettings } from './ai'
import type { Requirement, UploadedFile } from './types'

const settings: AiSettings = { provider: 'groq', model: '', key: 'sk-secret-123' }
const reqs: Requirement[] = ['Trade License', 'TIN Certificate', 'Signed Declaration'].map((t, i) => ({
  id: `R0${i + 1}`, order: i + 1, title_en: t, title_bn: t, mandatory: true, has_expiry: false,
}))
const file = (id: string, name: string): UploadedFile => ({ id, name, size: 1, pages: 1, hash: id, bytes: new ArrayBuffer(8), state: 'ready' })
const files = [file('a', 'scan_0042.pdf'), file('b', 'tl.pdf'), file('c', 'tin.pdf')]
const none = { reqs: new Set<string>(), files: new Set<string>() }

// A fake network: records the request and answers with the given reply.
function fake(reply: { status?: number; content?: string; throws?: Error }) {
  const calls: Array<{ url: string; headers: Record<string, string>; body: string }> = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, headers: init.headers as Record<string, string>, body: String(init.body) })
    if (reply.throws) throw reply.throws
    return new Response(JSON.stringify({ choices: [{ message: { content: reply.content ?? '' } }] }), { status: reply.status ?? 200 })
  }) as unknown as typeof fetch
  return { impl, calls }
}

describe('extractJson', () => {
  it('finds JSON inside text and code fences, and rejects the rest', () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(() => extractJson('no json here')).toThrow(AiError)
    expect(() => extractJson('{broken')).toThrow(AiError)
  })
})

describe('suggestMatchesAI', () => {
  it('sends only titles and file names, with the key in the header and not in the body', async () => {
    const f = fake({ content: '{"matches":[{"requirement":"R03","file":"F1"}]}' })
    const r = await suggestMatchesAI(settings, reqs, files, none, f.impl)
    expect(r).toEqual([['R03', 'a']])
    const call = f.calls[0]
    expect(call.headers.Authorization).toBe('Bearer sk-secret-123')
    expect(call.body).not.toContain('sk-secret-123')
    expect(call.body).toContain('scan_0042.pdf')
    expect(call.body).not.toMatch(/bytes|ArrayBuffer|hash/)
    expect(call.url).toContain('api.groq.com')
  })
  it('ignores invented ids, repeats and already-matched items', async () => {
    const f = fake({
      content: 'Here: {"matches":[{"requirement":"R01","file":"F2"},{"requirement":"R01","file":"F3"},{"requirement":"R99","file":"F1"},{"requirement":"R02","file":"F9"},{"requirement":"R02","file":"F2"},{"requirement":"R03","file":"F1"}]}',
    })
    const taken = { reqs: new Set(['R03']), files: new Set<string>() }
    const r = await suggestMatchesAI(settings, reqs, files, taken, f.impl)
    // R01 takes F2 (a repeat of R01 is dropped); R02 wants F2 which is used; R03 is already matched
    expect(r).toEqual([['R01', 'b']])
  })
  it('does not call the network when there is nothing left to match', async () => {
    const f = fake({})
    const all = { reqs: new Set(reqs.map((r) => r.id)), files: new Set<string>() }
    expect(await suggestMatchesAI(settings, reqs, files, all, f.impl)).toEqual([])
    expect(f.calls.length).toBe(0)
  })
  it('explains each kind of failure', async () => {
    const code = async (r: Parameters<typeof fake>[0], s = settings) => {
      try { await suggestMatchesAI(s, reqs, files, none, fake(r).impl) } catch (e) { return (e as AiError).code }
    }
    expect(await code({}, { ...settings, key: '  ' })).toBe('no_key')
    expect(await code({ status: 401 })).toBe('auth')
    expect(await code({ status: 429 })).toBe('rate')
    expect(await code({ status: 500 })).toBe('http')
    expect(await code({ throws: new TypeError('Failed to fetch') })).toBe('network')
    expect(await code({ content: 'not json' })).toBe('bad_response')
    expect(await code({ content: '{"matches":"nope"}' })).toBe('bad_response')
  })
})

describe('translateTenderAI', () => {
  const tender = { title: 'Supply of IT Equipment', procuring_entity: 'Directorate', bidder: 'Meghna Tech' }
  it('keeps only real Bangla text', async () => {
    const f = fake({ content: '{"title":"আইটি সরঞ্জাম সরবরাহ","procuring_entity":"Directorate","bidder":"মেঘনা টেক"}' })
    expect(await translateTenderAI(settings, tender, f.impl)).toEqual({ title: 'আইটি সরঞ্জাম সরবরাহ', procuring_entity: undefined, bidder: 'মেঘনা টেক' })
  })
  it('fails clearly when nothing in Bangla came back', async () => {
    const f = fake({ content: '{"title":"English again","procuring_entity":"x","bidder":"y"}' })
    await expect(translateTenderAI(settings, tender, f.impl)).rejects.toMatchObject({ code: 'bad_response' })
  })
})
