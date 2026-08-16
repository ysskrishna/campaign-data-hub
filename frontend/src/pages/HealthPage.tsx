import { useEffect, useMemo, useState } from 'react'
import { api, fmtPct, platformLabel, type Delivery, type QualityReport } from '../api'
import DeliveryDrawer from '../components/DeliveryDrawer'
import HealthBadge from '../components/HealthBadge'
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Data Health</h1>
        <button
          type="button"
          className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--surface)] disabled:opacity-50"
          onClick={runIngest}
          disabled={ingesting}
        >
          {ingesting ? 'Ingesting…' : 'Run ingest'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Files" value={String(stats.total)} hint="Total deliveries" />
        <StatCard label="Passing" value={String(stats.pass)} tone="pass" hint={`${stats.warn} warn · ${stats.fail} fail`} />
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

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search files, platforms, weeks…"
          className="w-full sm:w-72"
        />
        <PlatformSelect value={platform} onChange={setPlatform} />
        <HealthSelect value={health} onChange={setHealth} />
        <span className="text-xs text-[var(--muted)] sm:ml-auto">
          {filtered.length} file{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left text-[var(--muted)]">
              <th className="px-4 py-2.5 font-medium">Health</th>
              <th className="px-4 py-2.5 font-medium">Platform</th>
              <th className="px-4 py-2.5 font-medium">Week</th>
              <th className="px-4 py-2.5 font-medium">File</th>
              <th className="px-4 py-2.5 font-medium text-right">Rows</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[var(--muted)]">
                  {search || platform || health ? 'No deliveries match your filters.' : 'No deliveries yet. Run ingest to load files.'}
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr
                  key={d.id}
                  className={`hover:bg-[var(--surface)]/60 cursor-pointer ${selected?.id === d.id && drawerOpen ? 'bg-[var(--surface)]' : ''}`}
                  onClick={() => openDelivery(d)}
                >
                  <td className="px-4 py-2.5">
                    <HealthBadge health={d.health} />
                  </td>
                  <td className="px-4 py-2.5">{platformLabel[d.platform] ?? d.platform}</td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">{d.week_start}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs">{d.filename}</span>
                    {!d.is_canonical && (
                      <span className="ml-2 text-xs text-amber-600 font-medium">duplicate</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {d.row_count_accepted} / {d.row_count_raw}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {cadenceGap && (
        <div className="mt-4 text-sm border border-amber-200 bg-amber-50 rounded-lg px-4 py-3">
          <span className="font-medium text-amber-800">Cadence gap:</span>{' '}
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
