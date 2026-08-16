const styles: Record<string, string> = {
  pass: 'bg-[var(--pass-bg)] text-[var(--pass)] ring-[var(--pass-border)]',
  warn: 'bg-[var(--warn-bg)] text-[var(--warn)] ring-[var(--warn-border)]',
  fail: 'bg-[var(--fail-bg)] text-[var(--fail)] ring-[var(--fail-border)]',
}

const dots: Record<string, string> = {
  pass: 'bg-[var(--pass)]',
  warn: 'bg-[var(--warn)]',
  fail: 'bg-[var(--fail)]',
}

export default function HealthBadge({ health }: { health: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset capitalize ${styles[health] ?? 'bg-gray-50 text-gray-600 ring-gray-200'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dots[health] ?? 'bg-gray-400'}`} aria-hidden />
      {health}
    </span>
  )
}

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const colors: Record<string, string> = {
    pass: 'text-[var(--pass)]',
    warn: 'text-[var(--warn)]',
    fail: 'text-[var(--fail)]',
  }
  const dots: Record<string, string> = {
    pass: 'bg-[var(--pass)]',
    warn: 'bg-[var(--warn)]',
    fail: 'bg-[var(--fail)]',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold capitalize ${colors[outcome] ?? ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dots[outcome] ?? 'bg-gray-400'}`} aria-hidden />
      {outcome}
    </span>
  )
}

export const healthRowAccent: Record<string, string> = {
  pass: 'border-l-[var(--pass)]',
  warn: 'border-l-[var(--warn)]',
  fail: 'border-l-[var(--fail)]',
}

export const outcomeBorder: Record<string, string> = {
  pass: 'border-l-[var(--pass)]',
  warn: 'border-l-[var(--warn)]',
  fail: 'border-l-[var(--fail)]',
}
