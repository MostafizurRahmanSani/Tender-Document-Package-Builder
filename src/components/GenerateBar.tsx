import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck, Download, FileDown, LoaderCircle, Sheet } from 'lucide-react'
import type { Store } from '../state'
import { STATUS_STYLE, Button, formatDate } from './ui'
import { buildPackage } from '../pdf/buildPackage'
import { todayLocalISO } from '../logic/dates'

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function GenerateBar({ store, onJump }: { store: Store; onJump: (reqId: string) => void }) {
  const { state, t, views, blockers } = store
  const lang = state.lang
  const tender = state.tender!
  const [busy, setBusy] = useState(false)
  const [withIndex, setWithIndex] = useState(false)
  const [result, setResult] = useState<{ blob: Blob; pages: number } | null>(null)
  const [failed, setFailed] = useState(false)

  // Any change after a download makes the old result out of date.
  useEffect(() => {
    setResult(null)
    setFailed(false)
  }, [views])

  const required = views.filter((v) => v.req.mandatory)
  const readyRequired = required.filter((v) => v.status === 'ok').length
  const blocked = blockers.length > 0
  const fileName = `${tender.tender_id}_Package.pdf`
  const docTitle = (v: (typeof views)[number]) => (lang === 'bn' ? v.req.title_bn : v.req.title_en)

  async function generate() {
    setBusy(true)
    setFailed(false)
    setResult(null)
    try {
      const items = views
        .filter((v) => v.status === 'ok' && v.file?.bytes)
        .map((v) => ({ order: v.req.order, title: v.req.title_en, bytes: v.file!.bytes! }))
      const r = await buildPackage(tender, items, todayLocalISO(), withIndex)
      const blob = new Blob([r.bytes as BlobPart], { type: 'application/pdf' })
      save(blob, fileName)
      setResult({ blob, pages: r.totalPages })
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  // Checklist export (bonus): opens correctly in Excel, Bangla included (UTF-8 BOM).
  function exportCsv() {
    const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`
    const head = [t('csv_document'), t('csv_file'), t('csv_pages'), t('csv_expiry'), t('csv_status')]
    const rows = views.map((v) => [
      docTitle(v),
      v.file?.name ?? '',
      v.file?.pages ?? '',
      v.req.has_expiry ? v.expiry ?? '' : '',
      t(STATUS_STYLE[v.status].label),
    ])
    const csv = [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
    save(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${tender.tender_id}_Checklist.csv`)
  }

  const reasonOf = (v: (typeof views)[number]) =>
    v.status === 'expired' && v.expiry ? `${t('st_expired')} · ${formatDate(lang, v.expiry)}` : t(STATUS_STYLE[v.status].label)

  return (
    <div
      className="sticky bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-3 sm:px-8 lg:flex-row lg:items-center lg:gap-6">
        {/* Readiness meter: one segment per document, in package order */}
        <div className="min-w-0 flex-1">
          <div className="flex gap-1" aria-hidden>
            {views.map((v) => (
              <motion.span
                key={v.req.id}
                layout
                className={`h-2 flex-1 rounded-full transition-colors duration-300 ${STATUS_STYLE[v.status].bar} ${v.req.mandatory ? '' : 'opacity-60'}`}
                title={docTitle(v)}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            {blocked ? (
              <>
                <span className="tabular font-semibold text-ink">{t('ready_count', { ok: readyRequired, total: required.length })}</span>
                <span className="hidden text-muted sm:inline">{t('blocked_title')}</span>
                {blockers.slice(0, 4).map((v, i) => (
                  <button
                    key={v.req.id}
                    type="button"
                    onClick={() => onJump(v.req.id)}
                    className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium underline-offset-2 hover:underline ${i > 0 ? 'hidden sm:inline' : ''} ${STATUS_STYLE[v.status].cls}`}
                  >
                    {docTitle(v)} — {reasonOf(v)}
                  </button>
                ))}
                {blockers.length > 1 && <span className="text-muted sm:hidden">{t('more_blockers', { n: blockers.length - 1 })}</span>}
                {blockers.length > 4 && <span className="hidden text-muted sm:inline">{t('more_blockers', { n: blockers.length - 4 })}</span>}
              </>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-ok">
                <CircleCheck size={16} aria-hidden /> {t('all_ready')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-2" title={t('with_index')}>
            <input type="checkbox" checked={withIndex} onChange={(e) => setWithIndex(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
            <span className="hidden sm:inline">{t('with_index')}</span>
            <span className="sm:hidden">{t('index_short')}</span>
          </label>
          <Button variant="ghost" size="md" onClick={exportCsv}>
            <Sheet size={16} aria-hidden /> <span className="hidden sm:inline">{t('export_csv')}</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button variant="primary" size="lg" onClick={generate} disabled={blocked || busy} aria-describedby="gen-status" className="ml-auto min-w-0 flex-1 sm:min-w-44 sm:flex-none">
            {busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <FileDown size={18} aria-hidden />}
            {busy ? t('generating') : t('generate')}
          </Button>
        </div>
      </div>

      <div id="gen-status" aria-live="polite" className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <AnimatePresence>
          {result && !blocked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-center gap-3 pb-3 text-sm"
            >
              <span className="flex items-center gap-1.5 font-medium text-ok">
                <CircleCheck size={16} aria-hidden /> {t('done', { pages: result.pages })}
              </span>
              <span className="tabular text-muted">{fileName}</span>
              <button type="button" onClick={() => save(result.blob, fileName)} className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
                <Download size={14} aria-hidden /> {t('download_again')}
              </button>
            </motion.div>
          )}
          {failed && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alert" className="pb-3 text-sm font-medium text-bad">
              {t('gen_failed')}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
