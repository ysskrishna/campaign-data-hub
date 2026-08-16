type Props = {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'pass' | 'warn' | 'fail'
}

const toneStyles = {
  default: '',
  pass: 'border-[var(--pass-border)] bg-[var(--pass-bg)]/40',
  warn: 'border-[var(--warn-border)] bg-[var(--warn-bg)]/40',
  fail: 'border-[var(--fail-border)] bg-[var(--fail-bg)]/40',
}

export default function StatCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-white px-4 py-3 ${toneStyles[tone]}`}>
      <div className="text-xs font-medium text-[var(--muted)] mb-1">{label}</div>
      <div className="text-xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="text-xs text-[var(--muted)] mt-1.5">{hint}</div>}
    </div>
  )
}
