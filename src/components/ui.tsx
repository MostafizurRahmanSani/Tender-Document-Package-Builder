import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, CalendarX, CircleAlert, CircleCheck, CircleMinus } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Lang, Status } from '../types'
import type { Key } from '../i18n'
import { isoToLocalDate } from '../logic/dates'

export const STATUS_STYLE: Record<Status, { cls: string; bar: string; icon: typeof CircleCheck; label: Key }> = {
  ok: { cls: 'bg-ok-soft text-ok', bar: 'bg-ok', icon: CircleCheck, label: 'st_ok' },
  missing: { cls: 'bg-bad-soft text-bad', bar: 'bg-bad', icon: CircleAlert, label: 'st_missing' },
  expired: { cls: 'bg-bad-soft text-bad', bar: 'bg-bad', icon: CalendarX, label: 'st_expired' },
  expiry_needed: { cls: 'bg-warn-soft text-warn', bar: 'bg-warn', icon: CalendarClock, label: 'st_expiry_needed' },
  not_provided: { cls: 'bg-idle-soft text-idle', bar: 'bg-line-strong', icon: CircleMinus, label: 'st_not_provided' },
}

export function StatusBadge({ status, label }: { status: Status; label: string }) {
  const s = STATUS_STYLE[status]
  const Icon = s.icon
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-2 pr-2.5 text-[13px] font-semibold ${s.cls}`}
        role="status"
      >
        <Icon size={15} strokeWidth={2.2} aria-hidden />
        {label}
      </motion.span>
    </AnimatePresence>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover disabled:bg-line-strong disabled:text-white',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken disabled:text-muted',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink disabled:text-muted/60',
  soft: 'bg-accent-soft text-accent-fg ring-1 ring-inset ring-accent-fg/35 hover:bg-accent hover:text-white hover:ring-accent disabled:bg-sunken disabled:text-muted disabled:ring-line',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; children: ReactNode }) {
  const sizes = { sm: 'h-8 px-2.5 text-[13px] gap-1.5', md: 'h-9 px-3.5 text-sm gap-2', lg: 'h-11 px-5 text-[15px] gap-2' }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-[background-color,color,transform] duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:active:scale-100 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function formatDate(lang: Lang, iso: string): string {
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    isoToLocalDate(iso),
  )
}

export function formatSize(lang: Lang, bytes: number): string {
  const mb = bytes / (1024 * 1024)
  const value = mb >= 1 ? mb : bytes / 1024
  const unit = mb >= 1 ? 'MB' : 'KB'
  const num = new Intl.NumberFormat(lang === 'bn' ? 'bn-BD' : 'en-US', { maximumFractionDigits: mb >= 1 ? 1 : 0 }).format(value)
  return `${num} ${unit}`
}
