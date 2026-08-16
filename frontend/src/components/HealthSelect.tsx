type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function HealthSelect({ value, onChange, className = '' }: Props) {
  return (
    <select
      className={`input-base min-w-[140px] px-3 py-2 ${className}`}
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
