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
    suppliersInNetwork: vendors.length || MOCK_STATS.suppliersInNetwork,
    bidsReceived: responses.count ?? 0,
    awardedContracts: awarded,
  }
}

export async function getBuyerRfpActivity(): Promise<RfpActivityEvent[]> {
  return MOCK_ACTIVITY
}
