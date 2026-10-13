import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export type AiSpendSummary = {
  /** Calendar month boundaries used for the figures, UTC. */
  monthLabel: string
  thisMonth: { costMicro: number; calls: number; inputTokens: number; outputTokens: number }
  lastMonth: { costMicro: number; calls: number }
  byFeature: { feature: string; calls: number; costMicro: number; inputTokens: number; outputTokens: number }[]
  last30DaysMicro: number
  /** From Anthropic's cost report, when ANTHROPIC_ADMIN_KEY is configured. */
  billed: { thisMonthMicro: number; lastMonthMicro: number; fetchedAt: string | null } | null
  model: string | null
}

function monthStart(d: Date, offset = 0) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1))
}

export async function getAiSpendSummary(): Promise<AiSpendSummary> {
  const now = new Date()
  const thisStart = monthStart(now)
  const lastStart = monthStart(now, -1)
  const nextStart = monthStart(now, 1)
  const monthLabel = thisStart.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
  const empty: AiSpendSummary = {
    monthLabel,
    thisMonth: { costMicro: 0, calls: 0, inputTokens: 0, outputTokens: 0 },
    lastMonth: { costMicro: 0, calls: 0 },
    byFeature: [],
    last30DaysMicro: 0,
    billed: null,
    model: null,
  }
  if (!isSupabaseConfigured()) return empty

  const admin = createAdminClient()
  const since = lastStart.toISOString()
  const { data, error } = await admin
    .from("ai_usage")
    .select("feature, model, input_tokens, output_tokens, cost_microdollars, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20000)
  if (error) {
    console.error("[ai-usage] summary:", error.message)
    return empty
  }

  const rows = data ?? []
  const thirtyAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString()
  const summary: AiSpendSummary = { ...empty, byFeature: [] }
  const byFeature = new Map<string, AiSpendSummary["byFeature"][number]>()

  for (const r of rows) {
    const created = r.created_at as string
    const micro = Number(r.cost_microdollars ?? 0)
    const inTok = Number(r.input_tokens ?? 0)
    const outTok = Number(r.output_tokens ?? 0)
    if (!summary.model && typeof r.model === "string") summary.model = r.model
    if (created >= thisStart.toISOString() && created < nextStart.toISOString()) {
      summary.thisMonth.costMicro += micro
      summary.thisMonth.calls += 1
      summary.thisMonth.inputTokens += inTok
      summary.thisMonth.outputTokens += outTok
      const f = byFeature.get(r.feature as string) ?? { feature: r.feature as string, calls: 0, costMicro: 0, inputTokens: 0, outputTokens: 0 }
      f.calls += 1
      f.costMicro += micro
      f.inputTokens += inTok
      f.outputTokens += outTok
      byFeature.set(r.feature as string, f)
    } else if (created >= lastStart.toISOString() && created < thisStart.toISOString()) {
      summary.lastMonth.costMicro += micro
      summary.lastMonth.calls += 1
    }
    if (created >= thirtyAgo) summary.last30DaysMicro += micro
  }
  summary.byFeature = [...byFeature.values()].sort((a, b) => b.costMicro - a.costMicro)

  const { data: billed } = await admin
    .from("ai_cost_daily")
    .select("day, amount_microdollars, fetched_at")
    .gte("day", lastStart.toISOString().slice(0, 10))
  if (billed && billed.length) {
    const thisKey = thisStart.toISOString().slice(0, 7)
    let thisMonthMicro = 0
    let lastMonthMicro = 0
    let fetchedAt: string | null = null
    for (const b of billed) {
      const amt = Number(b.amount_microdollars ?? 0)
      if (String(b.day).startsWith(thisKey)) thisMonthMicro += amt
      else lastMonthMicro += amt
      if (!fetchedAt || (b.fetched_at as string) > fetchedAt) fetchedAt = b.fetched_at as string
    }
    summary.billed = { thisMonthMicro, lastMonthMicro, fetchedAt }
  }

  return summary
}
