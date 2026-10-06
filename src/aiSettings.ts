import { useCallback, useState } from 'react'
import { PROVIDERS, type AiSettings, type Provider } from './ai'

// The key lives only in this tab's session storage: it is gone when the tab closes, and it is never
// part of a project file, the browser copy of the work, or the code. Provider and model are not secret.
const KEY = 'tpb-ai-key'
const CFG = 'tpb-ai-cfg'

function load(): AiSettings {
  let provider: Provider = 'groq'
  let model = ''
  let key = ''
  try {
    const cfg = JSON.parse(localStorage.getItem(CFG) ?? '{}')
    if (cfg.provider in PROVIDERS) provider = cfg.provider
    if (typeof cfg.model === 'string') model = cfg.model.slice(0, 100)
  } catch {
    /* defaults */
  }
  try {
    key = sessionStorage.getItem(KEY) ?? ''
  } catch {
    /* blocked storage: the key is simply kept in memory */
  }
  return { provider, model, key }
}

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(load)

  const update = useCallback((patch: Partial<AiSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      try {
        localStorage.setItem(CFG, JSON.stringify({ provider: next.provider, model: next.model }))
        if (next.key) sessionStorage.setItem(KEY, next.key)
        else sessionStorage.removeItem(KEY)
      } catch {
        /* blocked storage */
      }
      return next
    })
  }, [])

  return { settings, update, hasKey: settings.key.trim().length > 0 }
}
