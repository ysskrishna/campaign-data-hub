import { useEffect, useMemo, useState } from 'react'
import { api, fmtPct, platformLabel, type Delivery, type QualityReport } from '../api'
import DeliveryDrawer from '../components/DeliveryDrawer'
import HealthBadge, { healthRowAccent } from '../components/HealthBadge'
import HealthSelect from '../components/HealthSelect'
import PlatformSelect from '../components/PlatformSelect'
import SearchInput from '../components/SearchInput'
import StatCard from '../components/StatCard'

export default function HealthPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [selected, setSelected] = useState<Delivery | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [report, setReport] = useState<QualityReport | null>(null)
  const [cadenceGap, setCadenceGap] = useState<string | null>(null)
  const [ingesting, setIngesting] = useState(false)
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('')
  const [health, setHealth] = useState('')

  const load = async () => {
    const res = await api.deliveries()
    if (res.data) setDeliveries(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!selected) {
      setReport(null)
      return
    }
    api.qualityReport(selected.id).then((res) => {
      if (res.data) setReport(res.data)
    })
  }, [selected])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deliveries.filter((d) => {
      if (platform && d.platform !== platform) return false
      if (health && d.health !== health) return false
      if (!q) return true
      const label = platformLabel[d.platform] ?? d.platform
      return (
        d.filename.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q) ||
        d.week_start.includes(q) ||
        d.health.includes(q)
      )
    })
  }, [deliveries, search, platform, health])

  const stats = useMemo(() => {
    const pass = deliveries.filter((d) => d.health === 'pass').length
    const warn = deliveries.filter((d) => d.health === 'warn').length
    const fail = deliveries.filter((d) => d.health === 'fail').length
    const raw = deliveries.reduce((s, d) => s + d.row_count_raw, 0)
    const accepted = deliveries.reduce((s, d) => s + d.row_count_accepted, 0)
    const rate = raw > 0 ? accepted / raw : null
    return { pass, warn, fail, total: deliveries.length, rate }
  }, [deliveries])

  const runIngest = async () => {
    setIngesting(true)
    const res = await api.ingest()
    if (res.data && typeof res.data === 'object' && 'cadence_gaps' in res.data) {
      const gaps = (res.data as { cadence_gaps?: string[] }).cadence_gaps
      setCadenceGap(gaps?.[0] ?? null)
    }
    await load()
    setIngesting(false)
  }

  const openDelivery = (d: Delivery) => {
    setSelected(d)
    setDrawerOpen(true)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Data Health</h1>
          <p className="page-desc">Review delivery quality and drill into check outcomes.</p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={runIngest} disabled={ingesting}>
          {ingesting ? 'Ingesting…' : 'Run ingest'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Files" value={String(stats.total)} hint="Total deliveries" />
        <StatCard
          label="Passing"
          value={String(stats.pass)}
          tone="pass"
          hint={`${stats.warn} warn · ${stats.fail} fail`}
        />
        <StatCard
          label="Acceptance rate"
          value={stats.rate !== null ? fmtPct(stats.rate) : '—'}
          hint="Accepted rows / raw rows"
        />
        <StatCard
          label="Issues"
          value={String(stats.warn + stats.fail)}
          tone={stats.warn + stats.fail > 0 ? 'warn' : 'default'}
          hint="Files with warn or fail"
        />
      </div>

      <div className="filter-bar">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search files, platforms, weeks…"
          className="w-full sm:w-72"
        />
        <PlatformSelect value={platform} onChange={setPlatform} />
        <HealthSelect value={health} onChange={setHealth} />
        <span className="text-xs text-[var(--muted)] sm:ml-auto tabular-nums">
          {filtered.length} file{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="table-shell">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head">
              <th className="table-head-cell">Health</th>
              <th className="table-head-cell">Platform</th>
              <th className="table-head-cell">Week</th>
              <th className="table-head-cell">File</th>
              <th className="table-head-cell text-right">Rows</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-cell py-12 text-center text-[var(--muted)]">
                  {search || platform || health
                    ? 'No deliveries match your filters.'
                    : 'No deliveries yet. Run ingest to load files.'}
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const isSelected = selected?.id === d.id && drawerOpen
                const accent = healthRowAccent[d.health] ?? 'border-l-gray-300'
                return (
                  <tr
                    key={d.id}
                    className={`border-l-[3px] ${accent} hover:bg-[var(--surface)]/70 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[var(--surface)]' : ''
                    }`}
                    onClick={() => openDelivery(d)}
                  >
                    <td className="table-cell">
                      <HealthBadge health={d.health} />
                    </td>
                    <td className="table-cell">{platformLabel[d.platform] ?? d.platform}</td>
                    <td className="table-cell text-[var(--muted)] tabular-nums">{d.week_start}</td>
                    <td className="table-cell min-w-0">
                      <span className="font-mono text-xs break-all">{d.filename}</span>
                      {!d.is_canonical && (
                        <span className="ml-2 text-xs text-[var(--warn)] font-semibold">duplicate</span>
                      )}
                    </td>
                    <td className="table-cell text-right tabular-nums whitespace-nowrap">
                      <span className="font-medium">{d.row_count_accepted}</span>
                      <span className="text-[var(--muted)]"> / {d.row_count_raw}</span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {cadenceGap && (
        <div className="alert-warn">
          <span className="font-semibold text-amber-800">Cadence gap:</span>{' '}
          <span className="text-amber-700">{cadenceGap}</span>
          <span className="text-amber-600"> — expected delivery not found</span>
        </div>
      )}

      <DeliveryDrawer
        delivery={selected}
        report={report}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
