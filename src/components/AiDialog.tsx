import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { KeyRound, ShieldCheck, Sparkles, X } from 'lucide-react'
import { PROVIDERS, type AiSettings, type Provider } from '../ai'
import type { Key, Vars } from '../i18n'
import { Button } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  t: (key: Key, vars?: Vars) => string
  settings: AiSettings
  onChange: (patch: Partial<AiSettings>) => void
}

// Settings for the optional AI help: provider, model and the user's own key.
export function AiDialog({ open, onClose, t, settings, onChange }: Props) {
  const keyInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    keyInput.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="max-h-full w-full max-w-lg overflow-auto rounded-lg border border-line bg-surface p-5 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.4)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-fg">
                <Sparkles size={18} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="ai-title" className="text-lg font-semibold text-ink">
                  {t('ai_title')}
                </h2>
                <p className="mt-0.5 text-sm text-ink-2">{t('ai_intro')}</p>
              </div>
              <button type="button" onClick={onClose} aria-label={t('ai_close')} className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink">
                <X size={16} aria-hidden />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-ink-2">
                  {t('ai_provider')}
                  <select
                    value={settings.provider}
                    onChange={(e) => onChange({ provider: e.target.value as Provider, model: '' })}
                    className="h-10 rounded-md border border-line-strong bg-surface px-2.5 text-sm font-normal text-ink"
                  >
                    {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
                      <option key={p} value={p}>
                        {PROVIDERS[p].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink-2">
                  {t('ai_model')}
                  <input
                    type="text"
                    value={settings.model}
                    onChange={(e) => onChange({ model: e.target.value })}
                    placeholder={PROVIDERS[settings.provider].model}
                    aria-label={`${t('ai_model')} (${t('ai_model_ph')})`}
                    spellCheck={false}
                    autoComplete="off"
                    className="h-10 rounded-md border border-line-strong bg-surface px-3 text-sm font-normal text-ink"
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-sm font-medium text-ink-2">
                <span className="flex items-center gap-1.5">
                  <KeyRound size={14} aria-hidden /> {t('ai_key')}
                </span>
                <input
                  ref={keyInput}
                  type="password"
                  value={settings.key}
                  onChange={(e) => onChange({ key: e.target.value })}
                  placeholder={t('ai_key_ph')}
                  spellCheck={false}
                  autoComplete="off"
                  className="h-10 rounded-md border border-line-strong bg-surface px-3 text-sm font-normal text-ink"
                />
                <span className="text-[13px] font-normal text-muted">{t('ai_key_note')}</span>
              </label>

              <p className="flex gap-2 rounded-md bg-sunken px-3 py-2.5 text-[13px] text-ink-2">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden /> {t('ai_sends')}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap justify-between gap-2">
              <Button variant="ghost" size="md" onClick={() => onChange({ key: '' })} disabled={!settings.key}>
                {t('ai_remove_key')}
              </Button>
              <Button variant="primary" size="md" onClick={onClose}>
                {t('ai_close')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
