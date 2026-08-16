import { useEffect, useState } from 'react'
import { api, platformLabel, type Delivery, type QualityReport } from '../api'

function HealthBadge({ health }: { health: string }) {
  const styles: Record<string, string> = {
    pass: 'bg-[#ecfdf5] text-[#047857]',
    warn: 'bg-[#fffbeb] text-[#b45309]',
    fail: 'bg-[#fef2f2] text-[#b91c1c]',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[health] ?? ''}`}>
      {health}
    </span>
  )
}

function Outcome({ outcome }: { outcome: string }) {
  const colors: Record<string, string> = {
    pass: 'text-[#047857]',
    warn: 'text-[#b45309]',
    fail: 'text-[#b91c1c]',
  }
  return <span className={`font-medium ${colors[outcome] ?? ''}`}>{outcome}</span>
}

export default function HealthPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [selected, setSelected] = useState<Delivery | null>(null)
  const [report, setReport] = useState<QualityReport | null>(null)
  const [cadenceGap, setCadenceGap] = useState<string | null>(null)
  const [ingesting, setIngesting] = useState(false)

  const load = async () => {
    const res = await api.deliveries()
    if (res.data) {
      setDeliveries(res.data)
      if (!selected && res.data.length > 0) {
        setSelected(res.data[0])
      }
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!selected) return
    api.qualityReport(selected.id).then((res) => {
      if (res.data) setReport(res.data)
    })
  }, [selected])

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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium mb-1">Data health</h1>
          <p className="text-sm text-[#6b6b6b]">Delivery quality by file. Select a row for details.</p>
        </div>
        <button
          className="text-sm px-4 py-2 rounded-lg border border-[#e5e5e5] hover:bg-[#fafafa] disabled:opacity-50"
          onClick={runIngest}
          disabled={ingesting}
        >
          {ingesting ? 'Ingesting…' : 'Run ingest'}
        </button>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="border border-[#e5e5e5] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-left text-[#6b6b6b]">
                  <th className="px-4 py-3 font-medium">Health</th>
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">Week</th>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Rows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {deliveries.map((d) => (
                  <tr
                    key={d.id}
                    className={`hover:bg-[#fafafa] cursor-pointer ${selected?.id === d.id ? 'bg-[#f7f7f7]' : ''}`}
                    onClick={() => setSelected(d)}
                  >
                    <td className="px-4 py-3"><HealthBadge health={d.health} /></td>
                    <td className="px-4 py-3">{platformLabel[d.platform] ?? d.platform}</td>
                    <td className="px-4 py-3">{d.week_start}</td>
                    <td className="px-4 py-3 text-[#6b6b6b]">
                      {d.filename}
                      {!d.is_canonical && <span className="text-[#b45309]"> · duplicate</span>}
                    </td>
                    <td className="px-4 py-3">
                      {d.row_count_accepted} / {d.row_count_raw}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {cadenceGap && (
            <div className="mt-4 border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm">
              <span className="text-[#6b6b6b]">Cadence gap:</span>
              <span className="text-[#b45309] font-medium"> {cadenceGap}</span>
              <span className="text-[#6b6b6b]"> — expected delivery not found</span>
            </div>
          )}
        </div>

        {selected && report && (
          <div className="w-[380px] shrink-0 border border-[#e5e5e5] rounded-xl p-5">
            <div className="mb-4">
              <div className="text-xs text-[#6b6b6b] mb-1">Selected delivery</div>
              <div className="font-medium">{selected.filename}</div>
              <div className="text-sm text-[#6b6b6b] mt-1">
                {platformLabel[selected.platform]} · week {selected.week_start}
              </div>
            </div>
            <div className="flex items-center gap-2 mb-5">
              <HealthBadge health={selected.health} />
              <span className="text-sm text-[#6b6b6b]">
                {selected.row_count_accepted} accepted · {selected.row_count_raw - selected.row_count_accepted} skipped/rejected
              </span>
            </div>

            <div className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide mb-3">Quality checks</div>
            <ul className="space-y-3 text-sm mb-5">
              {report.checks.map((c) => (
                <li key={c.check_name} className="flex justify-between gap-2">
                  <span>{c.check_name}</span>
                  <Outcome outcome={c.outcome} />
                </li>
              ))}
            </ul>

            {report.rejected_rows.length > 0 && (
              <div className="pt-5 border-t border-[#e5e5e5]">
                <div className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide mb-3">Rejected rows</div>
                <div className="space-y-2">
                  {report.rejected_rows.slice(0, 5).map((r) => (
                    <div key={r.row} className="bg-[#fafafa] rounded-lg p-3 text-xs font-mono">
                      <div className="text-[#6b6b6b] mb-1">Row {r.row} · {r.reason}</div>
                      <div>{r.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
