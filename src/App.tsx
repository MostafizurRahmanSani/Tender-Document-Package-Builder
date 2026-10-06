import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { CalendarDays, Building2, Briefcase, RotateCcw, ShieldCheck, Wand2 } from 'lucide-react'
import { useStore } from './state'
import { Start } from './components/Start'
import { Requirements } from './components/Requirements'
import { Files } from './components/Files'
import { GenerateBar } from './components/GenerateBar'
import { Button, formatDate } from './components/ui'
import type { Lang } from './types'
import { toBnDigits } from './i18n'

export default function App() {
  const store = useStore()
  const { state, t, actions } = store
  const [flash, setFlash] = useState<string | null>(null)
  const [toast, setToast] = useState<number | null>(null) // matches made by auto-match
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Scroll to a document from the blocker list and briefly highlight it.
  function jump(reqId: string) {
    document.getElementById(`req-${reqId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlash(reqId)
    window.setTimeout(() => setFlash(null), 1400)
  }

  function autoMatch() {
    const n = actions.autoMatch()
    setToast(n)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 4000)
  }

  const tender = state.tender
  const tenderIdShown = tender ? (state.lang === 'bn' ? toBnDigits(tender.tender_id) : tender.tender_id) : ''

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
          <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="./icon-192.png" alt="" width={32} height={32} className="size-8 shrink-0" />
              <span className="truncate font-semibold tracking-[-0.01em] text-ink">{t('app_name')}</span>
            </div>
            {tender && (
              <span className="tabular hidden rounded-full border border-line bg-sunken px-2.5 py-0.5 text-[13px] font-medium text-ink-2 md:inline">
                {tenderIdShown}
              </span>
            )}
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-[13px] text-muted lg:flex">
                <ShieldCheck size={15} className="text-ok" aria-hidden /> {t('privacy')}
              </span>
              <LangSwitch lang={state.lang} onChange={actions.setLang} label={t('lang_label')} />
            </div>
          </div>
        </header>

        {!tender ? (
          <Start t={t} onLoaded={actions.load} />
        ) : (
          <>
            <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-10 sm:px-8">
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="border-b border-line py-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="tabular text-sm font-medium text-accent">
                      {t('tender_id')} · {tenderIdShown}
                    </p>
                    <h1 className="mt-1 text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-tight tracking-[-0.02em] text-ink">{tender.title}</h1>
                  </div>
                  <Button variant="secondary" size="sm" onClick={actions.closeTender}>
                    <RotateCcw size={14} aria-hidden /> {t('change_tender')}
                  </Button>
                </div>
                <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-3">
                  <Meta icon={Building2} label={t('procuring_entity')} value={tender.procuring_entity} />
                  <Meta icon={Briefcase} label={t('bidder')} value={tender.bidder} />
                  <Meta icon={CalendarDays} label={t('deadline')} value={formatDate(state.lang, tender.submission_deadline)} strong />
                </dl>
              </motion.section>

              <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)] lg:gap-12">
                <Requirements store={store} flash={flash} onAutoMatch={autoMatch} />
                <aside className="lg:sticky lg:top-20 lg:self-start">
                  <Files store={store} />
                </aside>
              </div>
            </main>
            <GenerateBar store={store} onJump={jump} />
          </>
        )}

        <AnimatePresence>
          {toast !== null && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              role="status"
              className="fixed bottom-36 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-sm text-white shadow-lg lg:bottom-28"
            >
              <Wand2 size={15} aria-hidden /> {toast > 0 ? t('auto_matched', { n: toast }) : t('auto_matched_none')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

function Meta({ icon: Icon, label, value, strong }: { icon: typeof Building2; label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex min-w-0 gap-2.5">
      <Icon size={17} className="mt-0.5 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[13px] text-muted">{label}</dt>
        <dd className={`break-words ${strong ? 'font-semibold text-ink' : 'text-ink-2'}`}>{value}</dd>
      </div>
    </div>
  )
}

function LangSwitch({ lang, onChange, label }: { lang: Lang; onChange: (l: Lang) => void; label: string }) {
  const opts: Array<[Lang, string]> = [
    ['en', 'EN'],
    ['bn', 'বাংলা'],
  ]
  return (
    <div role="radiogroup" aria-label={label} className="relative flex rounded-md border border-line bg-sunken p-0.5">
      {opts.map(([value, text]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={lang === value}
          lang={value}
          onClick={() => onChange(value)}
          className={`relative h-8 rounded-[5px] px-3 text-[13px] font-semibold transition-colors ${lang === value ? 'text-ink' : 'text-muted hover:text-ink'}`}
        >
          {lang === value && (
            <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-[5px] bg-surface shadow-sm ring-1 ring-line" transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }} />
          )}
          <span className="relative">{text}</span>
        </button>
      ))}
    </div>
  )
}
