type Props = {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'pass' | 'warn' | 'fail'
}

const toneStyles = {
  default: '',
  pass: 'border-emerald-200 bg-emerald-50/50',
  warn: 'border-amber-200 bg-amber-50/50',
  fail: 'border-red-200 bg-red-50/50',
}

export default function StatCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-white px-4 py-3 ${toneStyles[tone]}`}>
      <div className="text-xs text-[var(--muted)] mb-1">{label}</div>
      <div className="text-xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-[var(--muted)] mt-1">{hint}</div>}
    </div>
  )
}
