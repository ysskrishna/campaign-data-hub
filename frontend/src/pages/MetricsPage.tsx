import { useEffect, useMemo, useState } from 'react'
import { api, fmtMoney, fmtNum, fmtPct, platformLabel, type MetricsRow, type MetricsSummary } from '../api'
import DateRangePicker from '../components/DateRangePicker'
import PlatformSelect from '../components/PlatformSelect'
import SearchInput from '../components/SearchInput'
import StatCard from '../components/StatCard'
import { presetToRange, type DatePreset } from '../lib/dateRange'

type SortKey = 'spend_usd' | 'ctr'
type SortOrder = 'asc' | 'desc'

function SortHeader({
  label,
  active,
  order,
  onClick,
  align = 'left',
}: {
  label: string
  active: boolean
  order: SortOrder
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <th className={`table-head-cell ${align === 'right' ? 'text-right' : ''}`}>
      <button
        type="button"
        className={`sort-btn ${align === 'right' ? 'ml-auto' : ''} ${active ? 'text-[var(--foreground)]' : ''}`}
        onClick={onClick}
        aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        {active && <span aria-hidden>{order === 'desc' ? '↓' : '↑'}</span>}
      </button>
    </th>
  )
}

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
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Metrics</h1>
          <p className="page-desc">Normalized spend, impressions, and derived CTR/CPC across platforms.</p>
        </div>
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard label="Spend" value={fmtMoney(summary.spend_usd)} />
          <StatCard label="Impressions" value={fmtNum(summary.impressions)} />
          <StatCard label="Clicks" value={fmtNum(summary.clicks)} />
          <StatCard label="CTR" value={fmtPct(summary.ctr)} />
          <StatCard label="CPC" value={summary.cpc !== null ? fmtMoney(summary.cpc) : '—'} />
        </div>
      )}

      <div className="filter-bar">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search campaigns…"
          className="w-full sm:w-64"
        />
        <PlatformSelect value={platform} onChange={setPlatform} />
        <span className="text-xs text-[var(--muted)] sm:ml-auto tabular-nums">
          {filteredRows.length} campaign{filteredRows.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="table-shell">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head">
              <th className="table-head-cell">Campaign</th>
              <th className="table-head-cell">Platform</th>
              <SortHeader
                label="Spend"
                active={sort === 'spend_usd'}
                order={order}
                onClick={() => toggleSort('spend_usd')}
                align="right"
              />
              <th className="table-head-cell text-right">Impressions</th>
              <th className="table-head-cell text-right">Clicks</th>
              <SortHeader
                label="CTR"
                active={sort === 'ctr'}
                order={order}
                onClick={() => toggleSort('ctr')}
                align="right"
              />
              <th className="table-head-cell text-right">CPC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-cell py-12 text-center text-[var(--muted)]">
                  {search ? 'No campaigns match your search.' : 'No data for this range.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={`${row.platform}-${row.campaign}`} className="hover:bg-[var(--surface)]/70 transition-colors">
                  <td className="table-cell font-medium">{row.campaign}</td>
                  <td className="table-cell text-[var(--muted)]">
                    {platformLabel[row.platform] ?? row.platform}
                  </td>
                  <td className="table-cell text-right tabular-nums">{fmtMoney(row.spend_usd)}</td>
                  <td className="table-cell text-right tabular-nums">{fmtNum(row.impressions)}</td>
                  <td className="table-cell text-right tabular-nums">{fmtNum(row.clicks)}</td>
                  <td className="table-cell text-right tabular-nums">{fmtPct(row.ctr)}</td>
                  <td className="table-cell text-right tabular-nums">
                    {row.cpc !== null ? fmtMoney(row.cpc) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
