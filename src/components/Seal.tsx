import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, ImagePlus, Stamp, Trash2 } from 'lucide-react'
import type { Store } from '../state'
import { SEAL_POSITIONS, isPng, parsePageSpec, sealTargets, type SealMode } from '../logic/seal'
import { formatNumber, type Key } from '../i18n'
import { Button } from './ui'

const MODES: SealMode[] = ['last', 'first', 'all', 'custom']
const MAX_BYTES = 5 * 1024 * 1024

export function Seal({ store }: { store: Store }) {
  const { state, t, views, actions } = store
  const { seal, sealSettings: s, lang } = state
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<Key | null>(null)

  // Pages the package will have, so page choices can be checked while the user types.
  const plan = useMemo(() => {
    const docs = views.filter((v) => v.status === 'ok' && v.file)
    const front = state.withIndex ? 2 : 1
    const counts = docs.map((v) => v.file!.pages)
    const starts: number[] = []
    let next = front + 1
    for (const n of counts) {
      starts.push(next)
      next += n
    }
    return { starts, counts, total: next - 1 }
  }, [views, state.withIndex])

  const target = useMemo(() => sealTargets(s, plan.starts, plan.counts, plan.total), [s, plan])

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    if (file.size > MAX_BYTES) return setError('seal_err_big')
    const bytes = await file.arrayBuffer()
    if (!isPng(new Uint8Array(bytes, 0, 8))) return setError('seal_err_png')
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
    // Decode it once to get its size and to make sure it is a usable image.
    const img = new Image()
    img.onload = () => actions.setSeal({ name: file.name, bytes, width: img.naturalWidth, height: img.naturalHeight, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setError('seal_err_read')
    }
    img.src = url
  }

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept="image/png"
      className="sr-only"
      aria-label={t('seal_upload')}
      onChange={(e) => {
        pick(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  return (
    <section aria-labelledby="seal-title" className="mt-10 border-t border-line pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-fg">
            <Stamp size={18} aria-hidden />
          </span>
          <div>
            <h2 id="seal-title" className="text-lg font-semibold text-ink">
              {t('seal_title')} <span className="text-sm font-normal text-muted">({t('seal_optional')})</span>
            </h2>
            <p className="text-sm text-muted">{t('seal_hint')}</p>
          </div>
        </div>
        {!seal && (
          <Button variant="soft" size="md" onClick={() => input.current?.click()}>
            <ImagePlus size={16} aria-hidden /> {t('seal_upload')}
          </Button>
        )}
      </div>
      {fileInput}

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-2 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
          <CircleAlert size={16} className="shrink-0" aria-hidden /> {t(error)}
        </p>
      )}

      <AnimatePresence initial={false}>
        {seal && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 grid gap-5 sm:grid-cols-[148px_1fr]"
          >
            <div className="flex flex-col items-start gap-2">
              {/* Checkerboard behind the image so transparent seals are visible */}
              <div
                className="flex size-[148px] items-center justify-center rounded-md border border-line p-2"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, var(--color-sunken) 25%, transparent 25%, transparent 75%, var(--color-sunken) 75%), linear-gradient(45deg, var(--color-sunken) 25%, transparent 25%, transparent 75%, var(--color-sunken) 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 8px 8px',
                }}
              >
                <img src={seal.url} alt={seal.name} className="max-h-full max-w-full object-contain" />
              </div>
              <p className="max-w-[148px] truncate text-[13px] text-muted" title={seal.name}>
                {seal.name}
              </p>
              <div className="-ml-2.5 flex flex-col items-start gap-0.5">
                <Button variant="ghost" size="sm" onClick={() => input.current?.click()}>
                  {t('seal_replace')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => actions.setSeal(null)} aria-label={t('seal_remove')}>
                  <Trash2 size={14} aria-hidden /> {t('seal_remove')}
                </Button>
              </div>
            </div>

            <div className="grid min-w-0 gap-4">
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-ink-2">{t('seal_pages')}</legend>
                <div className="flex flex-wrap gap-2">
                  {MODES.map((m) => (
                    <label
                      key={m}
                      className={`inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        s.mode === m ? 'border-accent bg-accent-soft font-medium text-ink' : 'border-line-strong bg-surface text-ink-2 hover:bg-sunken'
                      }`}
                    >
                      <input type="radio" name="seal-mode" className="sr-only" checked={s.mode === m} onChange={() => actions.setSealSettings({ mode: m })} />
                      {t(`seal_mode_${m}` as Key)}
                    </label>
                  ))}
                </div>
                {s.mode === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={s.custom}
                      onChange={(e) => actions.setSealSettings({ custom: e.target.value })}
                      placeholder={t('seal_custom_ph')}
                      aria-label={t('seal_mode_custom')}
                      className="tabular h-9 w-full max-w-xs rounded-md border border-line-strong bg-surface px-3 text-sm text-ink"
                    />
                    <p className="mt-1 text-[13px] text-muted">{t('seal_custom_help', { n: plan.total })}</p>
                    {parsePageSpec(s.custom, plan.total).invalid.length > 0 && (
                      <p className="mt-1 text-[13px] text-bad">{t('seal_bad_pages', { list: parsePageSpec(s.custom, plan.total).invalid.join(', ') })}</p>
                    )}
                  </div>
                )}
                <p className={`mt-2 text-[13px] ${target.pages.length ? 'text-ok' : 'text-warn'}`}>
                  {target.pages.length ? t('seal_applies', { n: target.pages.length }) : t('seal_no_pages')}
                  {target.pages.length > 0 && target.pages.length <= 12 && (
                    <span className="tabular text-muted"> · {target.pages.map((p) => formatNumber(lang, p)).join(', ')}</span>
                  )}
                </p>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-ink-2">
                  {t('seal_position')}
                  <select
                    value={s.position}
                    onChange={(e) => actions.setSealSettings({ position: e.target.value as typeof s.position })}
                    className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-sm font-normal text-ink"
                  >
                    {SEAL_POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {t(`pos_${p.replace('-', '_')}` as Key)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink-2">
                  <span className="flex justify-between">
                    {t('seal_size')} <span className="tabular font-normal text-muted">{formatNumber(lang, s.widthPct)}%</span>
                  </span>
                  <input
                    type="range"
                    min={8}
                    max={45}
                    step={1}
                    value={s.widthPct}
                    onChange={(e) => actions.setSealSettings({ widthPct: Number(e.target.value) })}
                    className="h-9 accent-[var(--color-accent)]"
                  />
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
