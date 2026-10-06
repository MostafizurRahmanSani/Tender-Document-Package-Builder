import { useEffect, useRef, useState, type DragEvent } from 'react'
import { motion } from 'motion/react'
import { FileJson, FileStack, Download, CircleAlert, ShieldCheck, History, FolderOpen } from 'lucide-react'
import { parseRequirements, type ParseError } from '../logic/requirements'
import type { Requirement, Tender } from '../types'
import type { Key, Vars } from '../i18n'
import { clearSession, loadSession, type ProjectData, type ProjectError } from '../project'
import type { Lang } from '../types'

interface Props {
  t: (key: Key, vars?: Vars) => string
  lang: Lang
  onLoaded: (tender: Tender, reqs: Requirement[]) => void
  onResume: (project: ProjectData) => void
  onOpenProject: (file: File) => Promise<ProjectError | null>
}

export function Start({ t, lang, onLoaded, onResume, onOpenProject }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const projectInput = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState<ProjectData | null>(null)
  const [projectError, setProjectError] = useState<ProjectError | null>(null)

  // Work saved earlier in this browser, if any.
  useEffect(() => {
    let alive = true
    loadSession().then((p) => alive && setSaved(p))
    return () => {
      alive = false
    }
  }, [])

  async function openProject(file: File | undefined) {
    if (!file) return
    setProjectError(await onOpenProject(file))
  }

  const [error, setError] = useState<ParseError | null>(null)
  const [over, setOver] = useState(false)

  async function read(file: File | undefined) {
    if (!file) return
    const result = parseRequirements(await file.text())
    if (result.ok) {
      setError(null)
      onLoaded(result.tender, result.requirements)
    } else setError(result.error)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    read(e.dataTransfer.files[0])
  }

  const steps = [
    { icon: FileJson, title: t('step1'), hint: t('step1_hint') },
    { icon: FileStack, title: t('step2'), hint: t('step2_hint') },
    { icon: Download, title: t('step3'), hint: t('step3_hint') },
  ]

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-8 md:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <h1 className="text-[clamp(1.75rem,3.2vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink">{t('start_title')}</h1>
        <p className="mt-4 max-w-[58ch] text-[16px] text-ink-2">{t('start_lead')}</p>

        <ol className="mt-8 space-y-1">
          {steps.map((s, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.06, duration: 0.3 }}
              className="flex gap-4 border-b border-line py-4 last:border-b-0"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-fg">
                <s.icon size={18} aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-ink">{s.title}</p>
                <p className="text-sm text-muted">{s.hint}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="self-start"
      >
        {saved && (
          <div className="mb-4 rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-fg">
                <History size={18} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{t('resume_title')}</p>
                <p className="mt-0.5 truncate text-sm text-ink-2" title={saved.tender.title}>
                  {(lang === 'bn' && saved.tender.title_bn) || saved.tender.title}
                </p>
                <p className="tabular mt-0.5 text-[13px] text-muted">
                  {t('resume_meta', {
                    files: saved.files.length,
                    matched: Object.keys(saved.match.matches).length,
                    when: new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(saved.savedAt),
                  })}
                </p>
                <p className="mt-0.5 text-[13px] text-muted">{t('resume_local')}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 pl-12">
              <button
                type="button"
                onClick={() => onResume(saved)}
                className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                {t('resume_continue')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await clearSession()
                  setSaved(null)
                }}
                className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-ink-2 hover:bg-bad-soft hover:text-bad"
              >
                {t('resume_discard')}
              </button>
            </div>
          </div>
        )}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
            over ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'
          }`}
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-fg">
            <FileJson size={26} aria-hidden />
          </span>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {t('open_requirements')}
          </button>
          <p className="mt-2 text-sm text-muted">{t('drop_requirements')}</p>
          <input
            ref={input}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label={t('open_requirements')}
            onChange={(e) => {
              read(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>

        {error && (
          <div role="alert" className="mt-4 flex gap-3 rounded-md border border-bad/25 bg-bad-soft p-4 text-sm text-bad">
            <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p>{t(error.key, error as unknown as Vars)}</p>
          </div>
        )}

        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <ShieldCheck size={16} className="text-ok" aria-hidden />
          {t('privacy')}
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => projectInput.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <FolderOpen size={16} aria-hidden /> {t('open_project')}
          </button>
          <input
            ref={projectInput}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            data-project
            aria-label={t('open_project')}
            onChange={(e) => {
              openProject(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {projectError && (
            <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-bad">
              <CircleAlert size={15} className="shrink-0" aria-hidden /> {t(projectError)}
            </p>
          )}
        </div>
      </motion.section>
    </main>
  )
}
