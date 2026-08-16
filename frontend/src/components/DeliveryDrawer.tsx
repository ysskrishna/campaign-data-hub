import { useEffect } from 'react'
import { platformLabel, type Delivery, type QualityReport } from '../api'
import HealthBadge, { OutcomeBadge, outcomeBorder } from './HealthBadge'

type Props = {
  delivery: Delivery | null
  report: QualityReport | null
  open: boolean
  onClose: () => void
}

export default function DeliveryDrawer({ delivery, report, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !delivery) return null

  const rejected = delivery.row_count_raw - delivery.row_count_accepted

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
        aria-label="Close panel"
      />
      <aside
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in border-l border-[var(--border)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--border)] bg-[var(--surface)]/50">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--muted)] mb-1">Delivery details</p>
            <h2 id="drawer-title" className="font-semibold truncate">
              {delivery.filename}
            </h2>
            <p className="text-sm text-[var(--muted)] mt-0.5">
              {platformLabel[delivery.platform]} · week {delivery.week_start}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-[var(--muted)] hover:bg-white hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-5 border-b border-[var(--border)]">
            <HealthBadge health={delivery.health} />
            <span className="text-sm text-[var(--muted)] tabular-nums">
              {delivery.row_count_accepted} accepted · {rejected} skipped
            </span>
          </div>

          {report ? (
            <>
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">
                Quality checks
              </h3>
              <ul className="space-y-2 mb-6">
                {report.checks.map((c) => (
                  <li
                    key={c.check_name}
                    className={`flex items-center justify-between gap-3 text-sm py-2.5 px-3 rounded-lg bg-[var(--surface)] border-l-[3px] ${
                      outcomeBorder[c.outcome] ?? 'border-l-gray-300'
                    }`}
                  >
                    <span className="font-mono text-xs">{c.check_name}</span>
                    <OutcomeBadge outcome={c.outcome} />
                  </li>
                ))}
              </ul>

              {report.rejected_rows.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">
                    Rejected rows
                    <span className="ml-2 normal-case font-medium">({report.rejected_rows.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {report.rejected_rows.slice(0, 8).map((r) => (
                      <div
                        key={r.row}
                        className="rounded-lg border border-[var(--border)] bg-white p-3 text-xs"
                      >
                        <div className="text-[var(--muted)] mb-1.5">
                          Row {r.row} · <span className="font-medium text-[var(--foreground)]">{r.reason}</span>
                        </div>
                        <div className="font-mono text-[var(--foreground)] leading-relaxed">{r.message}</div>
                      </div>
                    ))}
                    {report.rejected_rows.length > 8 && (
                      <p className="text-xs text-[var(--muted)] pt-1">
                        Showing 8 of {report.rejected_rows.length} rejected rows.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">Loading quality report…</p>
          )}
        </div>
      </aside>
    </div>
  )
}
