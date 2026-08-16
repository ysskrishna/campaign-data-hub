import { useEffect, useState } from 'react'
import { api, fmtMoney, fmtNum, fmtPct, platformLabel, type MetricsRow, type MetricsSummary } from '../api'

type SortKey = 'spend_usd' | 'ctr'
type SortOrder = 'asc' | 'desc'

export default function MetricsPage() {
  const [platform, setPlatform] = useState('')
  const [startDate, setStartDate] = useState('2026-06-01')
  const [endDate, setEndDate] = useState('2026-06-30')
  const [sort, setSort] = useState<SortKey>('spend_usd')
  const [order, setOrder] = useState<SortOrder>('desc')
  const [rows, setRows] = useState<MetricsRow[]>([])
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      <h1 className="text-2xl font-medium mb-1">Campaign metrics</h1>
      <p className="text-sm text-[#6b6b6b] mb-8">Normalized spend, impressions, and derived CTR/CPC.</p>

      <div className="flex flex-wrap gap-4 items-end mb-6 pb-6 border-b border-[#e5e5e5]">
        <div>
          <label className="block text-xs text-[#6b6b6b] mb-1.5">Platform</label>
          <select
            className="text-sm border border-[#e5e5e5] rounded-lg px-3 py-2 bg-white min-w-[180px]"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="">All platforms</option>
            <option value="meta_ads">Meta Ads</option>
            <option value="google_ads">Google Ads</option>
            <option value="linkedin_ads">LinkedIn Ads</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#6b6b6b] mb-1.5">Start date</label>
          <input
            type="date"
            className="text-sm border border-[#e5e5e5] rounded-lg px-3 py-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-[#6b6b6b] mb-1.5">End date</label>
          <input
            type="date"
            className="text-sm border border-[#e5e5e5] rounded-lg px-3 py-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button
          className="text-sm px-4 py-2 rounded-lg bg-[#0d0d0d] text-white"
          onClick={() => load()}
        >
          Apply
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Spend (USD)', value: fmtMoney(summary.spend_usd) },
            { label: 'Impressions', value: fmtNum(summary.impressions) },
            { label: 'Clicks', value: fmtNum(summary.clicks) },
            { label: 'CTR', value: fmtPct(summary.ctr) },
            { label: 'CPC', value: summary.cpc !== null ? fmtMoney(summary.cpc) : '—' },
          ].map((item) => (
            <div key={item.label} className="border border-[#e5e5e5] rounded-xl px-4 py-3">
              <div className="text-xs text-[#6b6b6b] mb-1">{item.label}</div>
              <div className="text-lg font-medium">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="border border-[#e5e5e5] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-left text-[#6b6b6b]">
              <th className="px-4 py-3 font-medium">Campaign</th>
              <th className="px-4 py-3 font-medium">Platform</th>
              <th
                className="px-4 py-3 font-medium cursor-pointer"
                onClick={() => toggleSort('spend_usd')}
              >
                Spend {sort === 'spend_usd' ? (order === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th className="px-4 py-3 font-medium">Impressions</th>
              <th className="px-4 py-3 font-medium">Clicks</th>
              <th
                className="px-4 py-3 font-medium cursor-pointer"
                onClick={() => toggleSort('ctr')}
              >
                CTR {sort === 'ctr' ? (order === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th className="px-4 py-3 font-medium">CPC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e5e5]">
            {rows.map((row) => (
              <tr key={`${row.platform}-${row.campaign}`} className="hover:bg-[#fafafa]">
                <td className="px-4 py-3">{row.campaign}</td>
                <td className="px-4 py-3 text-[#6b6b6b]">{platformLabel[row.platform] ?? row.platform}</td>
                <td className="px-4 py-3 font-medium">{fmtMoney(row.spend_usd)}</td>
                <td className="px-4 py-3">{fmtNum(row.impressions)}</td>
                <td className="px-4 py-3">{fmtNum(row.clicks)}</td>
                <td className="px-4 py-3">{fmtPct(row.ctr)}</td>
                <td className="px-4 py-3">{row.cpc !== null ? fmtMoney(row.cpc) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
