import { DATE_PRESETS, type DatePreset } from '../lib/dateRange'

const selectClass =
  'text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]'

function presetLabel(value: DatePreset, label: string) {
  if (value === 'all') return 'All time'
  if (value === 'custom') return 'Custom range'
  return `Last ${label}`
}

type Props = {
  preset: DatePreset
  onPresetChange: (preset: DatePreset) => void
  customStart: string
  customEnd: string
  onCustomStartChange: (value: string) => void
  onCustomEndChange: (value: string) => void
}

export default function DateRangePicker({
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        value={preset}
        onChange={(e) => onPresetChange(e.target.value as DatePreset)}
        aria-label="Date range"
      >
        {DATE_PRESETS.map(({ value, label }) => (
          <option key={value} value={value}>
            {presetLabel(value, label)}
          </option>
        ))}
      </select>
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="text-sm border border-[var(--border)] rounded-lg px-2.5 py-2 bg-white"
            aria-label="Start date"
          />
          <span className="text-xs text-[var(--muted)]">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="text-sm border border-[var(--border)] rounded-lg px-2.5 py-2 bg-white"
            aria-label="End date"
          />
        </div>
      )}
    </div>
  )
}
