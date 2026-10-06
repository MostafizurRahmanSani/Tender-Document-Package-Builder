import { useRef, useState, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, Copy, FileText, FileWarning, LoaderCircle, Trash2, Upload, X } from 'lucide-react'
import type { Store } from '../state'
import { requirementOf, duplicateLock } from '../logic/match'
import { formatSize } from './ui'
import { formatNumber, type Key } from '../i18n'
import { MAX_TOTAL_BYTES } from '../logic/upload'

export function Files({ store }: { store: Store }) {
  const { state, t, dupes, actions } = store
  const lang = state.lang
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const total = state.files.reduce((n, f) => n + f.size, 0)
  const docName = (id: string) => {
    const r = state.requirements.find((x) => x.id === id)
    return r ? (lang === 'bn' ? r.title_bn : r.title_en) : id
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    actions.addFiles(e.dataTransfer.files)
  }

  return (
    <section aria-labelledby="files-title" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
        <div>
          <h2 id="files-title" className="text-lg font-semibold text-ink">
            {t('your_files')}
          </h2>
          <p className="text-sm text-muted">{t('files_hint')}</p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`mt-4 flex flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          over ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'
        }`}
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <Upload size={16} aria-hidden /> {t('add_pdfs')}
        </button>
        <p className="text-sm text-muted">{t('drop_pdfs')}</p>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="sr-only"
          aria-label={t('add_pdfs')}
          onChange={(e) => {
            if (e.target.files) actions.addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.min(100, (total / MAX_TOTAL_BYTES) * 100)}%` }} />
        </div>
        <p className="tabular shrink-0 text-[13px] text-muted">
          {t('usage', { count: state.files.length, size: formatSize(lang, total) })}
        </p>
      </div>

      {/* Rejected or unreadable files */}
      <div aria-live="polite" className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {state.notices.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-bad/20 bg-bad-soft px-3 py-2.5 text-sm text-bad"
            >
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
              <p className="min-w-0 flex-1 break-words">{t(`n_${n.kind}` as Key, { name: n.name })}</p>
              <button
                type="button"
                onClick={() => actions.dismiss(n.id)}
                className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-bad/10"
                aria-label={t('dismiss')}
              >
                <X size={14} aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {state.files.length === 0 ? (
        <p className="mt-6 rounded-md bg-sunken px-4 py-6 text-center text-sm text-muted">{t('empty_files')}</p>
      ) : (
        <ul className="mt-3">
          <AnimatePresence initial={false}>
            {state.files.map((f) => {
              const usedFor = requirementOf(state.match, f.id)
              const twins = dupes.get(f.id)
              const lock = duplicateLock(state.match, f.id, dupes)
              const twinName = twins ? state.files.find((x) => x.id === twins[0])?.name ?? '' : ''
              return (
                <motion.li
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="border-b border-line py-3 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${
                        f.state === 'error' ? 'bg-bad-soft text-bad' : usedFor ? 'bg-ok-soft text-ok' : 'bg-sunken text-muted'
                      }`}
                    >
                      {f.state === 'reading' ? (
                        <LoaderCircle size={16} className="animate-spin" aria-hidden />
                      ) : f.state === 'error' ? (
                        <FileWarning size={16} aria-hidden />
                      ) : (
                        <FileText size={16} aria-hidden />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink" title={f.name}>
                        {f.name}
                      </p>
                      <p className="tabular mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                        <span>{formatSize(lang, f.size)}</span>
                        {f.state === 'ready' && <span>· {f.pages === 1 ? t('page_one') : t('pages', { n: f.pages })}</span>}
                        {f.state === 'reading' && <span>· {t('reading')}</span>}
                        {twins && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-semibold text-warn"
                            title={t('same_as', { name: twinName })}
                          >
                            <Copy size={12} aria-hidden /> {t('duplicate')}
                          </span>
                        )}
                      </p>
                      {twins && <p className="mt-1 text-[13px] text-warn">{t('same_as', { name: twinName })}</p>}
                      {f.state === 'error' && <p className="mt-1 text-[13px] text-bad">{t(f.error === 'encrypted' ? 'file_encrypted' : 'file_damaged')}</p>}

                      {f.state === 'ready' && (
                        <select
                          value={usedFor ?? ''}
                          disabled={!!lock}
                          onChange={(e) => (e.target.value ? actions.assign(e.target.value, f.id) : usedFor && actions.unassign(usedFor))}
                          aria-label={`${t('match_to')} ${f.name}`}
                          className={`mt-2 h-8 w-full rounded-md border px-2 text-[13px] disabled:bg-sunken disabled:text-muted ${
                            usedFor ? 'border-ok/40 bg-ok-soft/50 text-ink' : 'border-line-strong bg-surface text-ink-2'
                          }`}
                        >
                          <option value="">{usedFor ? `— ${t('not_matched')}` : t('match_to')}</option>
                          {state.requirements.map((r) => (
                            <option key={r.id} value={r.id}>
                              {formatNumber(lang, r.order)}. {docName(r.id)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => actions.removeFile(f.id)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-bad-soft hover:text-bad"
                      aria-label={`${t('remove_file')}: ${f.name}`}
                      title={t('remove_file')}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
