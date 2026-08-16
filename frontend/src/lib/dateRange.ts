/** Latest date present in seeded campaign data */
export const DATA_ANCHOR_END = '2026-06-30'

export type DatePreset = '1' | '2' | '3' | '7' | '15' | '30' | '60' | 'all' | 'custom'

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: '1', label: '1d' },
  { value: '2', label: '2d' },
  { value: '3', label: '3d' },
  { value: '7', label: '7d' },
  { value: '15', label: '15d' },
  { value: '30', label: '30d' },
  { value: '60', label: '60d' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
]

function toIso(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function presetToRange(
  preset: DatePreset,
  customStart = '2026-06-01',
  customEnd = DATA_ANCHOR_END,
): { startDate: string | null; endDate: string | null } {
  if (preset === 'all') return { startDate: null, endDate: null }
  if (preset === 'custom') return { startDate: customStart, endDate: customEnd }

  const end = new Date(`${DATA_ANCHOR_END}T00:00:00`)
  const start = new Date(end)
  start.setDate(start.getDate() - (Number(preset) - 1))
  return { startDate: toIso(start), endDate: toIso(end) }
}
