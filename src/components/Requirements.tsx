import { motion } from 'motion/react'
import { FileText, Undo2, Wand2, X } from 'lucide-react'
import type { Store, RequirementView } from '../state'
import { requirementOf, duplicateLock } from '../logic/match'
import { Button, StatusBadge, STATUS_STYLE, formatDate } from './ui'
import { formatNumber } from '../i18n'

interface Props {
  store: Store
  flash: string | null
  onAutoMatch: () => void
}

export function Requirements({ store, flash, onAutoMatch }: Props) {
  const { state, t, views, actions } = store
  const readyFiles = state.files.filter((f) => f.state === 'ready')

  return (
    <section aria-labelledby="req-title" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h2 id="req-title" className="text-lg font-semibold text-ink">
            {t('required_docs')} <span className="tabular font-normal text-muted">({formatNumber(state.lang, views.length)})</span>
          </h2>
          <p className="text-sm text-muted">{t('required_docs_hint')}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onAutoMatch} disabled={!readyFiles.length}>
            <Wand2 size={15} aria-hidden /> {t('auto_match')}
          </Button>
          <Button variant="ghost" size="sm" onClick={actions.undo} disabled={!state.history.length}>
            <Undo2 size={15} aria-hidden /> {t('undo')}
          </Button>
        </div>
      </div>

      <ol>
        {views.map((v, i) => (
          <Row key={v.req.id} v={v} index={i} store={store} highlighted={flash === v.req.id} />
        ))}
      </ol>
    </section>
  )
}

function Row({ v, index, store, highlighted }: { v: RequirementView; index: number; store: Store; highlighted: boolean }) {
  const { state, t, dupes, actions } = store
  const { req, file, status } = v
  const lang = state.lang
  const title = lang === 'bn' ? req.title_bn : req.title_en
  const deadline = state.tender!.submission_deadline
  const docName = (id: string) => {
    const r = state.requirements.find((x) => x.id === id)
    return r ? (lang === 'bn' ? r.title_bn : r.title_en) : id
  }

  const reason = {
    missing: t('why_missing'),
    expiry_needed: t('why_expiry_needed'),
    expired: v.expiry ? t('why_expired', { date: formatDate(lang, v.expiry), deadline: formatDate(lang, deadline) }) : '',
    not_provided: t('why_not_provided'),
    ok: req.has_expiry && v.expiry ? t('why_ok_expiry', { date: formatDate(lang, v.expiry) }) : t('why_ok'),
  }[status]

  const options = state.files.filter((f) => f.state === 'ready')

  return (
    <motion.li
      id={`req-${req.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`relative scroll-mt-24 border-b border-line py-4 pl-4 transition-colors duration-500 ${highlighted ? 'bg-accent-soft' : ''}`}
    >
      {/* Thin status rail on the left edge */}
      <span aria-hidden className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${STATUS_STYLE[status].bar}`} />

      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <span className="tabular mt-0.5 w-6 shrink-0 text-sm font-semibold text-muted">{formatNumber(lang, req.order)}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug text-ink">{title}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            <span className={req.mandatory ? 'font-medium text-ink-2' : ''}>{req.mandatory ? t('mandatory') : t('optional')}</span>
            {req.has_expiry && <span>{t('needs_expiry')}</span>}
          </p>
        </div>
        <StatusBadge status={status} label={t(STATUS_STYLE[status].label)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 pl-10">
        {file ? (
          <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-line bg-surface py-1.5 pl-2.5 pr-1 text-sm">
            <FileText size={16} className="shrink-0 text-accent" aria-hidden />
            <span className="truncate font-medium text-ink" title={file.name}>
              {file.name}
            </span>
            <span className="tabular shrink-0 text-muted">· {file.pages === 1 ? t('page_one') : t('pages', { n: file.pages })}</span>
            <button
              type="button"
              onClick={() => actions.unassign(req.id)}
              className="ml-1 flex size-7 shrink-0 items-center justify-center rounded text-muted hover:bg-sunken hover:text-bad"
              aria-label={`${t('remove_match')}: ${title}`}
              title={t('remove_match')}
            >
              <X size={15} aria-hidden />
            </button>
          </span>
        ) : (
          <select
            value=""
            disabled={!options.length}
            onChange={(e) => e.target.value && actions.assign(req.id, e.target.value)}
            aria-label={`${t('choose_file')} ${title}`}
            className="h-9 w-full max-w-sm rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink disabled:bg-sunken disabled:text-muted sm:w-auto sm:min-w-64"
          >
            <option value="">{options.length ? t('choose_file') : t('no_files_yet')}</option>
            {options.map((f) => {
              const lock = duplicateLock(state.match, f.id, dupes)
              const usedFor = requirementOf(state.match, f.id)
              const lockName = lock ? state.files.find((x) => x.id === lock)?.name ?? '' : ''
              const note = lock ? ` — ${t('same_as', { name: lockName })}` : usedFor ? ` — ${t('in_use_by', { doc: docName(usedFor) })}` : ''
              return (
                <option key={f.id} value={f.id} disabled={!!lock}>
                  {f.name}
                  {note}
                </option>
              )
            })}
          </select>
        )}

        {req.has_expiry && file && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-ink-2">{t('expiry_date')}</span>
            <input
              type="date"
              value={v.expiry ?? ''}
              onChange={(e) => actions.setExpiry(req.id, e.target.value)}
              className={`tabular h-9 rounded-md border bg-surface px-2.5 text-sm text-ink ${
                status === 'expiry_needed' ? 'border-warn' : status === 'expired' ? 'border-bad' : 'border-line-strong'
              }`}
            />
          </label>
        )}
      </div>

      <p className={`mt-2 pl-10 text-[13px] ${status === 'ok' ? 'text-muted' : status === 'not_provided' ? 'text-muted' : STATUS_STYLE[status].cls.split(' ')[1]}`}>
        {reason}
      </p>
    </motion.li>
  )
}
