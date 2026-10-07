import "server-only"

import type { DirectoryVendor } from "@/lib/directory/shared"
import { listVerifiedVendors } from "@/lib/data/directory"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"

// Preview mode keeps the list in memory so the button is demoable.
const previewSaved = new Set<string>()

export async function listSavedVendorIds(buyerId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return [...previewSaved]
  const { data, error } = await createAdminClient().from("saved_suppliers").select("vendor_id").eq("buyer_id", buyerId).order("created_at", { ascending: false })
  if (error) return [] // table arrives with migration 0019
  return (data ?? []).map((r) => r.vendor_id as string)
}

export async function isSupplierSaved(buyerId: string, vendorId: string): Promise<boolean> {
  return (await listSavedVendorIds(buyerId)).includes(vendorId)
}

/** Saved suppliers that are still verified, newest first. */
export async function listSavedVendors(buyerId: string): Promise<DirectoryVendor[]> {
  const [ids, vendors] = await Promise.all([listSavedVendorIds(buyerId), listVerifiedVendors()])
  const byId = new Map(vendors.map((v) => [v.id, v]))
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
}

export async function setSupplierSaved(buyerId: string, vendorId: string, saved: boolean): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) {
    if (saved) previewSaved.add(vendorId)
    else previewSaved.delete(vendorId)
    return { ok: true }
  }
  const admin = createAdminClient()
  if (!saved) {
    const { error } = await admin.from("saved_suppliers").delete().eq("buyer_id", buyerId).eq("vendor_id", vendorId)
    return error ? { ok: false, message: "Couldn't update your saved list." } : { ok: true }
  }
  const { data: vendor } = await admin.from("vendors").select("id").eq("id", vendorId).eq("is_verified", true).maybeSingle()
  if (!vendor) return { ok: false, message: "Supplier not found." }
  const { error } = await admin.from("saved_suppliers").upsert({ buyer_id: buyerId, vendor_id: vendorId }, { onConflict: "buyer_id,vendor_id", ignoreDuplicates: true })
  return error ? { ok: false, message: "Couldn't update your saved list." } : { ok: true }
}
