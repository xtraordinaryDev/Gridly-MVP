import "server-only"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { listVerifiedVendors } from "@/lib/data/directory"

export interface BuyerDashboardStats {
  activeRfps: number
  suppliersInNetwork: number
  bidsReceived: number
  awardedContracts: number
}

export interface RfpActivityEvent {
  id: string
  type: "published" | "bid" | "awarded" | "closed"
  label: string
  date: string
}

const MOCK_STATS: BuyerDashboardStats = {
  activeRfps: 4,
  suppliersInNetwork: 312,
  bidsReceived: 18,
  awardedContracts: 2,
}

const MOCK_ACTIVITY: RfpActivityEvent[] = [
  {
    id: "a1",
    type: "bid",
    label: "3 new bids on “Bulk Diesel & DEF — Transit Fleet FY27”",
    date: "2026-05-30T14:00:00Z",
  },
  {
    id: "a2",
    type: "published",
    label: "Published “Unleaded & Premium Gasoline Supply”",
    date: "2026-05-28T09:30:00Z",
  },
  {
    id: "a3",
    type: "awarded",
    label: "Awarded “Heating Oil — Campus Facilities” to Heartland Energy",
    date: "2026-05-22T16:45:00Z",
  },
  {
    id: "a4",
    type: "closed",
    label: "Closed bidding on “Emergency Dyed Diesel — Q1”",
    date: "2026-05-15T11:00:00Z",
  },
]

export async function getBuyerDashboardStats(): Promise<BuyerDashboardStats> {
  if (!isSupabaseConfigured()) return MOCK_STATS

  const supabase = await createClient()
  const vendors = await listVerifiedVendors()

  const [rfps, responses] = await Promise.all([
    supabase.from("rfps").select("id, status", { count: "exact" }),
    supabase.from("rfp_responses").select("id", { count: "exact", head: true }),
  ])

  const active =
    rfps.data?.filter((r) => r.status === "published").length ?? rfps.count ?? 0
  const awarded =
    rfps.data?.filter((r) => r.status === "awarded").length ?? 0

  return {
    activeRfps: active,
    suppliersInNetwork: vendors.length,
    bidsReceived: responses.count ?? 0,
    awardedContracts: awarded,
  }
}

/**
 * Recent RFP activity for the signed-in buyer, derived from their RFPs and the
 * bids on them (RLS scopes both queries). Preview mode returns sample events.
 */
export async function getBuyerRfpActivity(limit = 8): Promise<RfpActivityEvent[]> {
  if (!isSupabaseConfigured()) return MOCK_ACTIVITY

  const supabase = await createClient()
  const { data: rfps } = await supabase
    .from("rfps")
    .select("id, title, status, published_at, bid_due_date")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(20)
  if (!rfps?.length) return []

  const ids = rfps.map((r) => r.id as string)
  const { data: bids } = await supabase
    .from("rfp_responses")
    .select("id, rfp_id, submitted_at")
    .in("rfp_id", ids)
    .order("submitted_at", { ascending: false })
    .limit(40)

  const titleOf = new Map(rfps.map((r) => [r.id as string, r.title as string]))
  const events: RfpActivityEvent[] = []

  for (const r of rfps) {
    events.push({ id: `pub-${r.id}`, type: "published", label: `Published “${r.title}”`, date: r.published_at as string })
    const due = r.bid_due_date as string | null
    if (due && (r.status === "closed" || r.status === "awarded") && new Date(due).getTime() <= Date.now()) {
      events.push({ id: `closed-${r.id}`, type: "closed", label: `Closed bidding on “${r.title}”`, date: due })
    }
  }

  // Collapse bids per RFP per day so a busy RFP reads as "3 new bids", not 3 rows.
  const bidGroups = new Map<string, { rfpId: string; count: number; date: string }>()
  for (const b of bids ?? []) {
    const day = (b.submitted_at as string).slice(0, 10)
    const key = `${b.rfp_id}|${day}`
    const g = bidGroups.get(key)
    if (g) g.count += 1
    else bidGroups.set(key, { rfpId: b.rfp_id as string, count: 1, date: b.submitted_at as string })
  }
  for (const [key, g] of bidGroups) {
    events.push({ id: `bid-${key}`, type: "bid", label: `${g.count} new bid${g.count === 1 ? "" : "s"} on “${titleOf.get(g.rfpId) ?? "RFP"}”`, date: g.date })
  }

  for (const r of rfps) {
    if (r.status !== "awarded") continue
    // No awarded_at column yet — the latest bid (or the deadline) is the closest timestamp we have.
    const latestBid = (bids ?? []).find((b) => b.rfp_id === r.id)?.submitted_at as string | undefined
    events.push({ id: `award-${r.id}`, type: "awarded", label: `Awarded “${r.title}”`, date: latestBid ?? (r.bid_due_date as string) ?? (r.published_at as string) })
  }

  return events.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit)
}
