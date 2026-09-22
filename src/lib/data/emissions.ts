import "server-only"

import { format } from "date-fns"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { listContracts, listFuelLines, listInvoices } from "@/lib/data/invoices"
import { DIESEL_KG_PER_GAL, factorFor } from "@/lib/emissions/factors"
import type { NamedAmount, Viewer } from "@/lib/invoicing/types"

export interface EmissionsTarget {
  year: number
  targetTons: number
  note: string | null
}

export interface EmissionsStats {
  year: number
  tonsYtd: number
  tonsPriorYtd: number | null
  gallonsYtd: number
  intensityKgPerGal: number | null
  renewableSharePct: number
  avoidedTonsYtd: number
  monthly: { month: string; label: string; tons: number }[]
  byFuel: NamedAmount[]
  byParty: NamedAmount[]
  target: (EmissionsTarget & { progressPct: number; remainingTons: number }) | null
}

const r2 = (n: number) => Math.round(n * 100) / 100

function lastMonths(n: number) {
  const out: { month: string; label: string }[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1))
    out.push({ month: m.toISOString().slice(0, 7), label: format(m, "MMM") })
  }
  return out
}

// ---------------------------------------------------------------------------
// Targets (buyer)
// ---------------------------------------------------------------------------
function mockTargets(): Map<string, EmissionsTarget> {
  const g = globalThis as unknown as { __gridlinkEmissionsTargets?: Map<string, EmissionsTarget> }
  if (!g.__gridlinkEmissionsTargets) {
    g.__gridlinkEmissionsTargets = new Map([[`preview-buyer:${new Date().getUTCFullYear()}`, { year: new Date().getUTCFullYear(), targetTons: 2400, note: "10% below FY25" }]])
  }
  return g.__gridlinkEmissionsTargets
}

export async function getEmissionsTarget(buyerId: string, year: number): Promise<EmissionsTarget | null> {
  if (!isSupabaseConfigured()) return mockTargets().get(`${buyerId}:${year}`) ?? null
  const { data } = await createAdminClient().from("emissions_targets").select("year, target_tons, note").eq("buyer_id", buyerId).eq("year", year).maybeSingle()
  if (!data) return null
  return { year: data.year as number, targetTons: Number(data.target_tons) || 0, note: (data.note as string) ?? null }
}

export async function setEmissionsTarget(buyerId: string, year: number, targetTons: number, note?: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) {
    mockTargets().set(`${buyerId}:${year}`, { year, targetTons: r2(targetTons), note: note?.trim() || null })
    return { ok: true }
  }
  const { error } = await createAdminClient().from("emissions_targets").upsert({ buyer_id: buyerId, year, target_tons: r2(targetTons), note: note?.trim() || null, updated_at: new Date().toISOString() })
  if (error) return { ok: false, message: "Couldn't save the target." }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
export async function getEmissionsStats(viewer: Viewer): Promise<EmissionsStats> {
  const year = new Date().getUTCFullYear()
  const [invoices, contracts, lines] = await Promise.all([listInvoices(viewer), listContracts(viewer), listFuelLines(viewer)])
  const invoiceById = new Map(invoices.map((i) => [i.id, i]))
  const contractById = new Map(contracts.map((c) => [c.id, c]))

  type Row = { tons: number; gallons: number; renewable: boolean; fuel: string; party: string; date: string; avoided: number }
  const rows: Row[] = []
  for (const l of lines) {
    const inv = invoiceById.get(l.invoiceId)
    if (!inv || inv.status === "draft" || inv.status === "void") continue
    const c = contractById.get(inv.contractId)
    const f = factorFor(c?.fuelType)
    const tons = (f.kgPerGallon * l.gallons) / 1000
    rows.push({
      tons,
      gallons: l.gallons,
      renewable: f.renewable,
      fuel: f.label,
      party: viewer.role === "buyer" ? inv.vendorName : inv.buyerName,
      date: inv.issueDate,
      avoided: f.renewable ? ((DIESEL_KG_PER_GAL - f.kgPerGallon) * l.gallons) / 1000 : 0,
    })
  }

  const ytd = rows.filter((r) => r.date.startsWith(String(year)))
  const prior = rows.filter((r) => r.date.startsWith(String(year - 1)))
  const tonsYtd = ytd.reduce((s, r) => s + r.tons, 0)
  const gallonsYtd = ytd.reduce((s, r) => s + r.gallons, 0)
  const renewableGal = ytd.filter((r) => r.renewable).reduce((s, r) => s + r.gallons, 0)

  const months = lastMonths(6)
  const monthly = months.map((m) => ({ ...m, tons: r2(rows.filter((r) => r.date.slice(0, 7) === m.month).reduce((s, r) => s + r.tons, 0)) }))

  const agg = (key: (r: Row) => string) => {
    const map = new Map<string, number>()
    for (const r of ytd) map.set(key(r), (map.get(key(r)) ?? 0) + r.tons)
    return [...map.entries()].map(([name, amount]) => ({ name, amount: r2(amount) })).sort((a, b) => b.amount - a.amount).slice(0, 6)
  }

  let target: EmissionsStats["target"] = null
  if (viewer.role === "buyer") {
    const t = await getEmissionsTarget(viewer.id, year)
    if (t) target = { ...t, progressPct: t.targetTons > 0 ? Math.round((tonsYtd / t.targetTons) * 100) : 0, remainingTons: r2(t.targetTons - tonsYtd) }
  }

  return {
    year,
    tonsYtd: r2(tonsYtd),
    tonsPriorYtd: prior.length ? r2(prior.reduce((s, r) => s + r.tons, 0)) : null,
    gallonsYtd: Math.round(gallonsYtd),
    intensityKgPerGal: gallonsYtd > 0 ? r2((tonsYtd * 1000) / gallonsYtd) : null,
    renewableSharePct: gallonsYtd > 0 ? Math.round((renewableGal / gallonsYtd) * 1000) / 10 : 0,
    avoidedTonsYtd: r2(ytd.reduce((s, r) => s + r.avoided, 0)),
    monthly,
    byFuel: agg((r) => r.fuel),
    byParty: agg((r) => r.party),
    target,
  }
}
