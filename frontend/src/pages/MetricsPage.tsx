import { useEffect, useMemo, useState } from 'react'
import { api, fmtMoney, fmtNum, fmtPct, platformLabel, type MetricsRow, type MetricsSummary } from '../api'
import DateRangePicker from '../components/DateRangePicker'
import PlatformSelect from '../components/PlatformSelect'
import SearchInput from '../components/SearchInput'
import StatCard from '../components/StatCard'
import { presetToRange, type DatePreset } from '../lib/dateRange'

type SortKey = 'spend_usd' | 'ctr'
type SortOrder = 'asc' | 'desc'

export default function MetricsPage() {
  const [platform, setPlatform] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('30')
  const [customStart, setCustomStart] = useState('2026-06-01')
  const [customEnd, setCustomEnd] = useState('2026-06-30')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('spend_usd')
  const [order, setOrder] = useState<SortOrder>('desc')
  const [rows, setRows] = useState<MetricsRow[]>([])
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { startDate, endDate } = presetToRange(datePreset, customStart, customEnd)

  const buildParams = () => {
    const p = new URLSearchParams()
    if (platform) p.set('platform', platform)
    if (startDate) p.set('start_date', startDate)
    if (endDate) p.set('end_date', endDate)
    p.set('sort', sort)
    p.set('order', order)
    return p
  }

  const load = async () => {
    setError(null)
    const params = buildParams()
    const [campaignsRes, summaryRes] = await Promise.all([
      api.metricsCampaigns(params),
      api.metricsSummary(params),
    ])
    if (campaignsRes.error || summaryRes.error) {
      setError(campaignsRes.error?.message || summaryRes.error?.message || 'Failed to load')
      return
    }
    setRows(campaignsRes.data?.rows ?? [])
    setSummary(summaryRes.data ?? null)
  }

  useEffect(() => {
    load()
  }, [platform, startDate, endDate, sort, order])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (row) =>
        row.campaign.toLowerCase().includes(q) ||
        (platformLabel[row.platform] ?? row.platform).toLowerCase().includes(q),
    )
  }, [rows, search])

  const toggleSort = (key: SortKey) => {
    if (sort === key) {
      setOrder(order === 'desc' ? 'asc' : 'desc')
    } else {
      setSort(key)
      setOrder('desc')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Metrics</h1>
        <DateRangePicker
          preset={datePreset}
          onPresetChange={setDatePreset}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <StatCard label="Spend" value={fmtMoney(summary.spend_usd)} />
          <StatCard label="Impressions" value={fmtNum(summary.impressions)} />
          <StatCard label="Clicks" value={fmtNum(summary.clicks)} />
          <StatCard label="CTR" value={fmtPct(summary.ctr)} />
          <StatCard label="CPC" value={summary.cpc !== null ? fmtMoney(summary.cpc) : '—'} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search campaigns…"
          className="w-full sm:w-64"
        />
        <PlatformSelect value={platform} onChange={setPlatform} />
        <span className="text-xs text-[var(--muted)] sm:ml-auto">
          {filteredRows.length} campaign{filteredRows.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
              <th className="px-4 py-2.5 font-medium">Campaign</th>
              <th className="px-4 py-2.5 font-medium">Platform</th>
              <th
                className="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-[var(--foreground)]"
                onClick={() => toggleSort('spend_usd')}
              >
                Spend {sort === 'spend_usd' ? (order === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th className="px-4 py-2.5 font-medium">Impressions</th>
              <th className="px-4 py-2.5 font-medium">Clicks</th>
              <th
                className="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-[var(--foreground)]"
                onClick={() => toggleSort('ctr')}
              >
                CTR {sort === 'ctr' ? (order === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th className="px-4 py-2.5 font-medium">CPC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)]">
                  {search ? 'No campaigns match your search.' : 'No data for this range.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={`${row.platform}-${row.campaign}`} className="hover:bg-[var(--surface)]/60">
                  <td className="px-4 py-2.5 font-medium">{row.campaign}</td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">
                    {platformLabel[row.platform] ?? row.platform}
                  </td>
                  <td className="px-4 py-2.5">{fmtMoney(row.spend_usd)}</td>
                  <td className="px-4 py-2.5">{fmtNum(row.impressions)}</td>
                  <td className="px-4 py-2.5">{fmtNum(row.clicks)}</td>
                  <td className="px-4 py-2.5">{fmtPct(row.ctr)}</td>
                  <td className="px-4 py-2.5">{row.cpc !== null ? fmtMoney(row.cpc) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
