import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { Lang, MatchState, Notice, NoticeKind, Requirement, SealImage, Status, Tender, UploadedFile } from './types'
import { DEFAULT_SEAL, type SealSettings } from './logic/seal'
import { EMPTY_MATCHES, assign, removeFile, setExpiry, unassign } from './logic/match'
import { findDuplicates } from './logic/duplicates'
import { statusOf, isBlocking } from './logic/status'
import { hasPdfSignature, limitProblem, sha256Hex } from './logic/upload'
import { suggestMatches } from './logic/autoMatch'
import { readPdf } from './pdf/readPdf'
import { translate, type Key, type Vars } from './i18n'

interface State {
  tender: Tender | null
  requirements: Requirement[]
  files: UploadedFile[]
  match: MatchState
  history: MatchState[] // undo stack
  notices: Notice[]
  lang: Lang
  withIndex: boolean // add an index page after the cover
  seal: SealImage | null
  sealSettings: SealSettings
}

type Action =
  | { type: 'load'; tender: Tender; requirements: Requirement[] }
  | { type: 'closeTender' }
  | { type: 'addFile'; file: UploadedFile }
  | { type: 'updateFile'; id: string; patch: Partial<UploadedFile> }
  | { type: 'removeFile'; id: string }
  | { type: 'removeAll' }
  | { type: 'match'; next: MatchState; record: boolean }
  | { type: 'undo' }
  | { type: 'notice'; kind: NoticeKind; name: string }
  | { type: 'dismiss'; id: string }
  | { type: 'lang'; lang: Lang }
  | { type: 'withIndex'; value: boolean }
  | { type: 'seal'; seal: SealImage | null }
  | { type: 'sealSettings'; patch: Partial<SealSettings> }

const uid = () => Math.random().toString(36).slice(2, 10)

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'load':
      return { ...s, tender: a.tender, requirements: a.requirements, match: EMPTY_MATCHES, history: [] }
    case 'closeTender':
      return { ...s, tender: null, requirements: [], match: EMPTY_MATCHES, history: [] }
    case 'addFile':
      return { ...s, files: [...s.files, a.file] }
    case 'updateFile':
      return { ...s, files: s.files.map((f) => (f.id === a.id ? { ...f, ...a.patch } : f)) }
    case 'removeFile': {
      const next = removeFile(s.match, a.id)
      return {
        ...s,
        files: s.files.filter((f) => f.id !== a.id),
        match: next,
        history: next === s.match ? s.history : [...s.history, s.match].slice(-50),
      }
    }
    case 'removeAll':
      if (!s.files.length) return s
      // Every file goes, so every match and expiry date goes with it.
      return { ...s, files: [], match: EMPTY_MATCHES, history: [], notices: [] }
    case 'match':
      if (a.next === s.match) return s
      return { ...s, match: a.next, history: a.record ? [...s.history, s.match].slice(-50) : s.history }
    case 'undo': {
      if (!s.history.length) return s
      // Files removed since the snapshot cannot come back, so drop their matches.
      const prev = s.history[s.history.length - 1]
      const alive = new Set(s.files.map((f) => f.id))
      const matches = Object.fromEntries(Object.entries(prev.matches).filter(([, f]) => alive.has(f)))
      const expiry = Object.fromEntries(Object.entries(prev.expiry).filter(([r]) => r in matches))
      return { ...s, match: { matches, expiry }, history: s.history.slice(0, -1) }
    }
    case 'notice':
      return { ...s, notices: [...s.notices, { id: uid(), kind: a.kind, name: a.name }].slice(-6) }
    case 'dismiss':
      return { ...s, notices: s.notices.filter((n) => n.id !== a.id) }
    case 'lang':
      return { ...s, lang: a.lang }
    case 'withIndex':
      return { ...s, withIndex: a.value }
    case 'seal':
      if (s.seal && s.seal !== a.seal) URL.revokeObjectURL(s.seal.url)
      return { ...s, seal: a.seal }
    case 'sealSettings':
      return { ...s, sealSettings: { ...s.sealSettings, ...a.patch } }
  }
}

function savedLang(): Lang {
  try {
    return localStorage.getItem('tpb-lang') === 'bn' ? 'bn' : 'en'
  } catch {
    return 'en'
  }
}

export interface RequirementView {
  req: Requirement
  file?: UploadedFile
  expiry?: string
  status: Status
}

export function useStore() {
  const [s, dispatch] = useReducer(reducer, undefined, () => ({
    tender: null,
    requirements: [],
    files: [],
    match: EMPTY_MATCHES,
    history: [],
    notices: [],
    lang: savedLang(),
    withIndex: false,
    seal: null,
    sealSettings: DEFAULT_SEAL,
  }))

  // Upload checks need the latest totals even while several files are being read.
  const live = useRef(s)
  live.current = s

  useEffect(() => {
    document.documentElement.lang = s.lang
    document.title = translate(s.lang, 'app_name')
    try {
      localStorage.setItem('tpb-lang', s.lang)
    } catch {
      /* storage blocked: the choice just won't be remembered */
    }
  }, [s.lang])

  const t = useCallback((key: Key, vars?: Vars) => translate(s.lang, key, vars), [s.lang])

  const dupes = useMemo(() => findDuplicates(s.files), [s.files])

  const views: RequirementView[] = useMemo(() => {
    const byId = new Map(s.files.map((f) => [f.id, f]))
    return s.requirements.map((req) => {
      const file = byId.get(s.match.matches[req.id] ?? '')
      const expiry = s.match.expiry[req.id]
      const status = statusOf(req, !!file, expiry, s.tender?.submission_deadline ?? '')
      return { req, file, expiry, status }
    })
  }, [s.requirements, s.files, s.match, s.tender])

  const blockers = useMemo(() => views.filter((v) => isBlocking(v.status)), [views])

  const addFiles = useCallback(async (list: FileList | File[]) => {
    // Count what is already accepted plus what this batch adds, so limits hold mid-batch.
    let count = live.current.files.length
    let bytes = live.current.files.reduce((n, f) => n + f.size, 0)
    for (const file of Array.from(list)) {
      const head = new Uint8Array(await file.slice(0, 5).arrayBuffer())
      if (!hasPdfSignature(head)) {
        dispatch({ type: 'notice', kind: 'not_pdf', name: file.name })
        continue
      }
      const problem = limitProblem(count, bytes, file.size)
      if (problem) {
        dispatch({ type: 'notice', kind: problem, name: file.name })
        continue
      }
      count += 1
      bytes += file.size
      const id = uid()
      dispatch({ type: 'addFile', file: { id, name: file.name, size: file.size, pages: 0, hash: '', bytes: null, state: 'reading' } })
      try {
        const data = await file.arrayBuffer()
        const [hash, info] = await Promise.all([sha256Hex(data), readPdf(data)])
        if ('error' in info) {
          dispatch({ type: 'updateFile', id, patch: { state: 'error', error: info.error, hash } })
          dispatch({ type: 'notice', kind: info.error, name: file.name })
        } else {
          dispatch({ type: 'updateFile', id, patch: { state: 'ready', pages: info.pages, hash, bytes: data } })
        }
      } catch {
        dispatch({ type: 'updateFile', id, patch: { state: 'error', error: 'damaged' } })
        dispatch({ type: 'notice', kind: 'damaged', name: file.name })
      }
    }
  }, [])

  const actions = useMemo(
    () => ({
      load: (tender: Tender, requirements: Requirement[]) => dispatch({ type: 'load', tender, requirements }),
      closeTender: () => dispatch({ type: 'closeTender' }),
      addFiles,
      removeFile: (id: string) => dispatch({ type: 'removeFile', id }),
      removeAll: () => dispatch({ type: 'removeAll' }),
      assign: (reqId: string, fileId: string) =>
        dispatch({ type: 'match', next: assign(live.current.match, reqId, fileId, findDuplicates(live.current.files)), record: true }),
      unassign: (reqId: string) => dispatch({ type: 'match', next: unassign(live.current.match, reqId), record: true }),
      setExpiry: (reqId: string, value: string) =>
        dispatch({ type: 'match', next: setExpiry(live.current.match, reqId, value), record: false }),
      undo: () => dispatch({ type: 'undo' }),
      // Returns how many new matches were made.
      autoMatch: (): number => {
        const cur = live.current
        const d = findDuplicates(cur.files)
        const taken = { reqs: new Set(Object.keys(cur.match.matches)), files: new Set(Object.values(cur.match.matches)) }
        let next = cur.match
        let made = 0
        for (const [r, f] of suggestMatches(cur.requirements, cur.files, taken)) {
          const after = assign(next, r, f, d)
          if (after !== next) made++
          next = after
        }
        dispatch({ type: 'match', next, record: true })
        return made
      },
      dismiss: (id: string) => dispatch({ type: 'dismiss', id }),
      setLang: (lang: Lang) => dispatch({ type: 'lang', lang }),
      setWithIndex: (value: boolean) => dispatch({ type: 'withIndex', value }),
      setSeal: (seal: SealImage | null) => dispatch({ type: 'seal', seal }),
      setSealSettings: (patch: Partial<SealSettings>) => dispatch({ type: 'sealSettings', patch }),
    }),
    [addFiles],
  )

  return { state: s, t, dupes, views, blockers, actions }
}

export type Store = ReturnType<typeof useStore>
