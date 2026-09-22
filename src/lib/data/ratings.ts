import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export interface SupplierRating {
  contractId: string
  stars: number
  comment: string | null
  createdAt: string
}

export interface VendorPerformance {
  vendorId: string
  avgStars: number | null
  ratingCount: number
  onTimePct: number | null
  deliveriesCount: number
  awardsCount: number
  activeContracts: number
}

type Result = { ok: true } | { ok: false; message: string }

const MOCK: Record<string, VendorPerformance> = {
  "vendor-apex": { vendorId: "vendor-apex", avgStars: 4.7, ratingCount: 6, onTimePct: 96, deliveriesCount: 48, awardsCount: 7, activeContracts: 3 },
}
const mockRatings = new Map<string, SupplierRating>()

export async function getContractRating(contractId: string): Promise<SupplierRating | null> {
  if (!isSupabaseConfigured()) return mockRatings.get(contractId) ?? null
  const { data } = await createAdminClient().from("supplier_ratings").select("contract_id, stars, comment, created_at").eq("contract_id", contractId).maybeSingle()
  return data ? { contractId: data.contract_id as string, stars: data.stars as number, comment: (data.comment as string) ?? null, createdAt: data.created_at as string } : null
}

export async function rateContract(buyerId: string, contractId: string, stars: number, comment?: string): Promise<Result> {
  if (stars < 1 || stars > 5) return { ok: false, message: "Pick 1 to 5 stars." }
  if (!isSupabaseConfigured()) {
    mockRatings.set(contractId, { contractId, stars, comment: comment?.trim() || null, createdAt: new Date().toISOString() })
    return { ok: true }
  }
  const admin = createAdminClient()
  const { data: c } = await admin.from("contracts").select("id, vendor_id, is_demo").eq("id", contractId).eq("buyer_id", buyerId).maybeSingle()
  if (!c) return { ok: false, message: "Contract not found." }
  const { error } = await admin.from("supplier_ratings").upsert({ contract_id: contractId, buyer_id: buyerId, vendor_id: c.vendor_id, stars, comment: comment?.trim() || null, is_demo: Boolean(c.is_demo) }, { onConflict: "contract_id" })
  return error ? { ok: false, message: "Couldn't save the rating." } : { ok: true }
}

/** Ratings, on-time delivery, and award history for a set of vendors. */
export async function listVendorPerformance(vendorIds: string[]): Promise<Map<string, VendorPerformance>> {
  const ids = [...new Set(vendorIds.filter(Boolean))]
  const out = new Map<string, VendorPerformance>()
  if (!ids.length) return out
  if (!isSupabaseConfigured()) {
    for (const id of ids) out.set(id, MOCK[id] ?? { vendorId: id, avgStars: 4.2 + ((id.length % 5) / 10), ratingCount: 2 + (id.length % 4), onTimePct: 88 + (id.length % 12), deliveriesCount: 10 + (id.length % 30), awardsCount: 1 + (id.length % 5), activeContracts: 1 })
    return out
  }
  const admin = createAdminClient()
  const [{ data: ratings }, { data: deliveries }, { data: contracts }] = await Promise.all([
    admin.from("supplier_ratings").select("vendor_id, stars").in("vendor_id", ids),
    admin.from("deliveries").select("vendor_id, on_time").in("vendor_id", ids),
    admin.from("contracts").select("vendor_id, status").in("vendor_id", ids),
  ])
  for (const id of ids) {
    const r = (ratings ?? []).filter((x) => x.vendor_id === id)
    const d = (deliveries ?? []).filter((x) => x.vendor_id === id)
    const rated = d.filter((x) => x.on_time != null)
    const c = (contracts ?? []).filter((x) => x.vendor_id === id)
    out.set(id, {
      vendorId: id,
      avgStars: r.length ? Math.round((r.reduce((s, x) => s + (x.stars as number), 0) / r.length) * 10) / 10 : null,
      ratingCount: r.length,
      onTimePct: rated.length ? Math.round((rated.filter((x) => x.on_time).length / rated.length) * 100) : null,
      deliveriesCount: d.length,
      awardsCount: c.length,
      activeContracts: c.filter((x) => x.status === "active").length,
    })
  }
  return out
}

export async function getVendorPerformance(vendorId: string): Promise<VendorPerformance> {
  return (await listVendorPerformance([vendorId])).get(vendorId) ?? { vendorId, avgStars: null, ratingCount: 0, onTimePct: null, deliveriesCount: 0, awardsCount: 0, activeContracts: 0 }
}
