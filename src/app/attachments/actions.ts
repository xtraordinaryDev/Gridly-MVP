"use server"

import { getSessionProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { resolveVendorIdForSession } from "@/lib/data/rfps"

/**
 * Short-lived signed URL for an RFP or bid attachment, or a delivery BOL.
 * The caller must be a party to the RFP / contract the file belongs to.
 */
export async function getAttachmentUrl(path: string, bucket: "rfp-attachments" | "delivery-docs" = "rfp-attachments"): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Downloads are not available in preview mode." }
  const profile = await getSessionProfile()
  if (!profile) return { ok: false, message: "Sign in to download attachments." }

  const admin = createAdminClient()
  let allowed = profile.role === "admin"

  if (!allowed && bucket === "rfp-attachments") {
    const vendorId = profile.role === "vendor" ? await resolveVendorIdForSession(profile.id, false) : null
    // RFP attachments: buyer owns the RFP, or vendor is invited.
    const { data: rfps } = await admin.from("rfps").select("id, buyer_id").contains("attachments", JSON.stringify([{ path }]))
    for (const r of rfps ?? []) {
      if (profile.role === "buyer" && r.buyer_id === profile.id) allowed = true
      if (vendorId) {
        const { data: inv } = await admin.from("rfp_invitations").select("id").eq("rfp_id", r.id).eq("vendor_id", vendorId).maybeSingle()
        if (inv) allowed = true
      }
    }
    if (!allowed) {
      // Bid attachments: the vendor who uploaded it, or the buyer of that RFP.
      const { data: resp } = await admin.from("rfp_responses").select("vendor_id, rfps(buyer_id)").eq("attachment_path", path).maybeSingle()
      if (resp) {
        if (vendorId && resp.vendor_id === vendorId) allowed = true
        const rfpRow = resp.rfps as unknown as { buyer_id: string } | { buyer_id: string }[] | null
        const ownerId = Array.isArray(rfpRow) ? rfpRow[0]?.buyer_id : rfpRow?.buyer_id
        if (profile.role === "buyer" && ownerId === profile.id) allowed = true
      }
    }
  }

  if (!allowed && bucket === "delivery-docs") {
    const vendorId = profile.role === "vendor" ? await resolveVendorIdForSession(profile.id, false) : null
    const { data: d } = await admin.from("deliveries").select("buyer_id, vendor_id").eq("bol_path", path).maybeSingle()
    if (d && ((profile.role === "buyer" && d.buyer_id === profile.id) || (vendorId && d.vendor_id === vendorId))) allowed = true
  }

  if (!allowed) return { ok: false, message: "You don't have access to this file." }
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 300)
  if (error || !data) return { ok: false, message: "Couldn't generate a download link." }
  return { ok: true, url: data.signedUrl }
}
