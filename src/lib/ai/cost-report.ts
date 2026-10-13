import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"

/**
 * Pulls the organization's official cost report from Anthropic's Admin API
 * and stores one row per day (total across models and cost types). Needs an
 * Admin API key (sk-ant-admin...) in ANTHROPIC_ADMIN_KEY; a regular API key
 * is rejected by that endpoint. Data lags a few minutes, so the cron fetches
 * the last few days every run and overwrites.
 */
export function isCostReportConfigured() {
  return Boolean(process.env.ANTHROPIC_ADMIN_KEY?.trim())
}

type CostBucket = {
  starting_at: string
  ending_at: string
  results: { amount: string; currency: string; description: string | null }[]
}

export async function syncAnthropicCosts(opts: { days?: number } = {}): Promise<{ days: number; totalMicro: number }> {
  const key = process.env.ANTHROPIC_ADMIN_KEY?.trim()
  if (!key || !isSupabaseConfigured()) return { days: 0, totalMicro: 0 }

  const days = Math.min(Math.max(opts.days ?? 4, 1), 31)
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  end.setUTCDate(end.getUTCDate() + 1) // through the end of today
  const start = new Date(end.getTime() - days * 86_400_000)

  const buckets: CostBucket[] = []
  let page: string | null = null
  for (let i = 0; i < 5; i++) {
    const url = new URL("https://api.anthropic.com/v1/organizations/cost_report")
    url.searchParams.set("starting_at", start.toISOString())
    url.searchParams.set("ending_at", end.toISOString())
    url.searchParams.set("bucket_width", "1d")
    url.searchParams.set("limit", "31")
    if (page) url.searchParams.set("page", page)
    const res = await fetch(url, {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "User-Agent": "GridLink/1.0 (https://gridlink.global)" },
      cache: "no-store",
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`cost_report ${res.status}: ${body.slice(0, 200)}`)
    }
    const json = (await res.json()) as { data: CostBucket[]; has_more: boolean; next_page: string | null }
    buckets.push(...(json.data ?? []))
    if (!json.has_more || !json.next_page) break
    page = json.next_page
  }

  // amount is a decimal string in cents ("123.45" == $1.2345); store in microdollars.
  const rows = buckets.map((b) => {
    const cents = b.results.reduce((sum, r) => sum + (r.currency === "USD" ? Number(r.amount) || 0 : 0), 0)
    return { day: b.starting_at.slice(0, 10), description: "total", amount_microdollars: Math.round(cents * 10_000), fetched_at: new Date().toISOString() }
  })
  if (rows.length) {
    const { error } = await createAdminClient().from("ai_cost_daily").upsert(rows, { onConflict: "day,description" })
    if (error) throw new Error(error.message)
  }
  return { days: rows.length, totalMicro: rows.reduce((s, r) => s + r.amount_microdollars, 0) }
}
