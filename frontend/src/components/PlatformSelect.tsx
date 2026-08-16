type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function PlatformSelect({ value, onChange, className = '' }: Props) {
  return (
    <select
      className={`text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-white min-w-[160px] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Platform filter"
    >
      <option value="">All platforms</option>
      <option value="meta_ads">Meta Ads</option>
      <option value="google_ads">Google Ads</option>
      <option value="linkedin_ads">LinkedIn Ads</option>
    </select>
  )
}
