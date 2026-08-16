type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function PlatformSelect({ value, onChange, className = '' }: Props) {
  return (
    <select
      className={`input-base min-w-[160px] px-3 py-2 ${className}`}
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
