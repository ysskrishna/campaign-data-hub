const API_BASE = '/api/v1'

export interface ApiResponse<T> {
  data: T | null
  meta: Record<string, unknown>
  error: { code: string; message: string; details?: Record<string, unknown> } | null
}

export interface MetricsRow {
  campaign: string
  platform: string
  spend_usd: number
  impressions: number
  clicks: number
  ctr: number | null
  cpc: number | null
}

export interface MetricsSummary {
  spend_usd: number
  impressions: number
  clicks: number
  ctr: number | null
  cpc: number | null
}

export interface Delivery {
  id: number
  platform: string
  week_start: string
  filename: string
  health: string
  is_canonical: boolean
  row_count_raw: number
  row_count_accepted: number
  ingested_at: string
}

export interface QualityReport {
  summary: Record<string, number>
  checks: Array<{
    check_name: string
    level: string
    outcome: string
    message: string
    details?: Record<string, unknown>
  }>
  rejected_rows: Array<{
    row: number
    reason: string
    message: string
    raw: Record<string, unknown>
  }>
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, options)
  return res.json()
}

export const api = {
  ingest: () =>
    request<unknown>('/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }),
  metricsCampaigns: (params: URLSearchParams) =>
    request<{ rows: MetricsRow[] }>(`/metrics/campaigns?${params}`),
  metricsSummary: (params: URLSearchParams) =>
    request<MetricsSummary>(`/metrics/summary?${params}`),
  deliveries: () => request<Delivery[]>('/deliveries'),
  qualityReport: (id: number) => request<QualityReport>(`/deliveries/${id}/quality-report`),
}

export const platformLabel: Record<string, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  linkedin_ads: 'LinkedIn Ads',
}

export function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function fmtPct(n: number | null) {
  if (n === null) return '—'
  return `${(n * 100).toFixed(2)}%`
}

export function fmtNum(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}
