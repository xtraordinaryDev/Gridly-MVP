import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export interface BuyerSite {
  id: string
  name: string
  address: string
  state: string | null
}

export interface AddressOptions {
  /** Named sites the buyer saved */
  sites: BuyerSite[]
  /** Distinct addresses used on this buyer's earlier RFPs */
  previous: string[]
}

const MOCK_SITES: BuyerSite[] = [
  { id: "site-1", name: "Heywood Garage", address: "560 6th Ave N, Minneapolis, MN 55411", state: "Minnesota" },
  { id: "site-2", name: "Transfer Rd Depot", address: "800 Transfer Rd, St. Paul, MN 55114", state: "Minnesota" },
  { id: "site-3", name: "South Garage", address: "2500 E 28th St, Minneapolis, MN 55406", state: "Minnesota" },
  { id: "site-4", name: "Madison Campus Yard", address: "1200 Campus Dr, Madison, WI 53706", state: "Wisconsin" },
]

export async function listAddressOptions(buyerId: string): Promise<AddressOptions> {
  if (!isSupabaseConfigured()) {
    return { sites: MOCK_SITES, previous: ["121 N LaSalle St, Chicago, IL 60602", "District 4 Yard, Des Moines, IA"] }
  }

  const admin = createAdminClient()
  const [{ data: sites }, { data: rfps }] = await Promise.all([
    admin.from("buyer_sites").select("id, name, address, state").eq("buyer_id", buyerId).order("name"),
    admin.from("rfps").select("delivery_addresses").eq("buyer_id", buyerId).order("created_at", { ascending: false }).limit(50),
  ])

  const siteAddrs = new Set((sites ?? []).map((s) => (s.address as string).trim().toLowerCase()))
  const previous: string[] = []
  const seen = new Set<string>()
  for (const r of rfps ?? []) {
    for (const a of (r.delivery_addresses as string[]) ?? []) {
      const t = a.trim()
      const k = t.toLowerCase()
      if (!t || seen.has(k) || siteAddrs.has(k) || /^(tbd|per contract|multiple|site list)/i.test(t)) continue
      seen.add(k)
      previous.push(t)
    }
  }

  return {
    sites: (sites ?? []).map((s) => ({ id: s.id as string, name: s.name as string, address: s.address as string, state: (s.state as string) ?? null })),
    previous: previous.slice(0, 12),
  }
}

export async function listBuyerSites(buyerId: string): Promise<BuyerSite[]> {
  if (!isSupabaseConfigured()) return MOCK_SITES
  const { data } = await createAdminClient().from("buyer_sites").select("id, name, address, state").eq("buyer_id", buyerId).order("name")
  return (data ?? []).map((s) => ({ id: s.id as string, name: s.name as string, address: s.address as string, state: (s.state as string) ?? null }))
}

export async function addBuyerSite(buyerId: string, site: { name: string; address: string; state?: string | null }): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) {
    MOCK_SITES.push({ id: `site-${Date.now()}`, name: site.name, address: site.address, state: site.state ?? null })
    return { ok: true }
  }
  const { error } = await createAdminClient().from("buyer_sites").insert({ buyer_id: buyerId, name: site.name.trim(), address: site.address.trim(), state: site.state || null })
  return error ? { ok: false, message: "Couldn't save the site." } : { ok: true }
}

export async function removeBuyerSite(buyerId: string, siteId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) {
    const i = MOCK_SITES.findIndex((s) => s.id === siteId)
    if (i >= 0) MOCK_SITES.splice(i, 1)
    return { ok: true }
  }
  const { error } = await createAdminClient().from("buyer_sites").delete().eq("id", siteId).eq("buyer_id", buyerId)
  return error ? { ok: false, message: "Couldn't remove the site." } : { ok: true }
}
