type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function HealthSelect({ value, onChange, className = '' }: Props) {
  return (
    <select
      className={`text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Health filter"
    >
      <option value="">All health</option>
      <option value="pass">Pass</option>
      <option value="warn">Warn</option>
      <option value="fail">Fail</option>
    </select>
  )
}
