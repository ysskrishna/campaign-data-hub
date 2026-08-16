const styles: Record<string, string> = {
  pass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warn: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  fail: 'bg-red-50 text-red-700 ring-red-600/20',
}

export default function HealthBadge({ health }: { health: string }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset capitalize ${styles[health] ?? 'bg-gray-50 text-gray-600'}`}
    >
      {health}
    </span>
  )
}

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const colors: Record<string, string> = {
    pass: 'text-emerald-600',
    warn: 'text-amber-600',
    fail: 'text-red-600',
  }
  return <span className={`text-sm font-medium capitalize ${colors[outcome] ?? ''}`}>{outcome}</span>
}
