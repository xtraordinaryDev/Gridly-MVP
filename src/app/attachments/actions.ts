"use server"

import { getSessionProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { fileExtension, isBidAttachmentPath, isBolPath, isRfpAttachmentPath, isSafeStoragePath, isUuid } from "@/lib/storage/paths"
import { issueUploadTicket, parseFileInfo, type UploadTicketResult } from "@/lib/storage/uploads"

const DENIED = { ok: false as const, message: "You don't have access to this file." }
const INLINE_SAFE = ["pdf", "png", "jpg", "jpeg"]

async function sessionVendorId(profile: { id: string; role: string }): Promise<string | null> {
  if (profile.role !== "vendor") return null
  const id = await resolveVendorIdForSession(profile.id, false)
  return isUuid(id) ? id : null
}

/** RFP attachment: any signed-in buyer, under their own rfps/{buyer id}/ prefix. */
export async function createRfpAttachmentUpload(file: unknown): Promise<UploadTicketResult> {
  const info = parseFileInfo(file)
  if (!info || !isSupabaseConfigured()) return { ok: false, message: "Invalid upload." }
  const profile = await getSessionProfile()
  if (profile?.role !== "buyer") return { ok: false, message: "Sign in as a buyer to attach files." }
  return issueUploadTicket("attachment", `rfps/${profile.id}`, info)
}

/** Bid attachment: a vendor invited to this RFP, under bids/{rfp id}/{vendor id}/. */
export async function createBidAttachmentUpload(rfpId: string, file: unknown): Promise<UploadTicketResult> {
  const info = parseFileInfo(file)
  if (!info || typeof rfpId !== "string" || !isUuid(rfpId) || !isSupabaseConfigured()) return { ok: false, message: "Invalid upload." }
  const profile = await getSessionProfile()
  const vendorId = profile ? await sessionVendorId(profile) : null
  if (!vendorId) return { ok: false, message: "Sign in as a supplier to attach files." }
  const { data: inv } = await createAdminClient().from("rfp_invitations").select("id, declined_at").eq("rfp_id", rfpId).eq("vendor_id", vendorId).maybeSingle()
  if (!inv || inv.declined_at) return { ok: false, message: "You haven't been invited to this RFP." }
  return issueUploadTicket("attachment", `bids/${rfpId}/${vendorId}`, info)
}

/** BOL / delivery ticket: the vendor on this contract, under deliveries/{contract id}/. */
export async function createDeliveryDocUpload(contractId: string, file: unknown): Promise<UploadTicketResult> {
  const info = parseFileInfo(file)
  if (!info || typeof contractId !== "string" || !isUuid(contractId) || !isSupabaseConfigured()) return { ok: false, message: "Invalid upload." }
  const profile = await getSessionProfile()
  const vendorId = profile ? await sessionVendorId(profile) : null
  if (!vendorId) return { ok: false, message: "Sign in as a supplier to attach files." }
  const { data: contract } = await createAdminClient().from("contracts").select("id").eq("id", contractId).eq("vendor_id", vendorId).maybeSingle()
  if (!contract) return { ok: false, message: "Contract not found." }
  return issueUploadTicket("bol", `deliveries/${contractId}`, info)
}

/**
 * Short-lived signed URL for an RFP or bid attachment, or a delivery BOL.
 *
 * A stored path is client-supplied, so a row that references it is not enough:
 * the path must also sit under the prefix that row's owner uploads to.
 * Otherwise saving someone else's path on your own draft would unlock it.
 */
export async function getAttachmentUrl(path: string, bucket: "rfp-attachments" | "delivery-docs" = "rfp-attachments"): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Downloads are not available in preview mode." }
  if (bucket !== "rfp-attachments" && bucket !== "delivery-docs") return DENIED
  const profile = await getSessionProfile()
  if (!profile) return { ok: false, message: "Sign in to download attachments." }
  if (!isSafeStoragePath(path)) return DENIED

  const admin = createAdminClient()
  const vendorId = await sessionVendorId(profile)
  let allowed = profile.role === "admin"

  if (!allowed && bucket === "rfp-attachments" && path.startsWith("rfps/")) {
    const { data: rfps } = await admin.from("rfps").select("id, buyer_id").contains("attachments", JSON.stringify([{ path }]))
    const rows = rfps ?? []
    const owners = new Set(rows.map((r) => r.buyer_id as string))
    const folder = path.split("/")[1]
    for (const r of rows) {
      const buyerId = r.buyer_id as string
      let underOwner = isRfpAttachmentPath(path, buyerId)
      if (!underOwner && isUuid(folder)) {
        // Pre-0017 uploads made while editing a draft live under rfps/{rfp id}/.
        const { data: source } = await admin.from("rfps").select("id").eq("id", folder).eq("buyer_id", buyerId).maybeSingle()
        underOwner = Boolean(source)
      }
      // Pre-0017 uploads for a new RFP live under rfps/new-…/, which names no
      // owner. Honour those only while a single buyer references the file.
      if (!underOwner && folder.startsWith("new-")) underOwner = owners.size === 1
      if (!underOwner) continue
      if (profile.role === "buyer" && buyerId === profile.id) allowed = true
      if (!allowed && vendorId) {
        const { data: inv } = await admin.from("rfp_invitations").select("id").eq("rfp_id", r.id).eq("vendor_id", vendorId).maybeSingle()
        if (inv) allowed = true
      }
      if (allowed) break
    }
  }

  if (!allowed && bucket === "rfp-attachments" && path.startsWith("bids/")) {
    // Bid attachments: the vendor who uploaded it, or the buyer of that RFP.
    const { data: bids } = await admin.from("rfp_responses").select("rfp_id, vendor_id, rfps(buyer_id)").eq("attachment_path", path)
    const rows = bids ?? []
    for (const b of rows) {
      const rfpId = b.rfp_id as string
      const bidVendorId = b.vendor_id as string
      // Pre-0017 bid uploads sit at bids/{rfp id}/{file} with no vendor folder;
      // honour those only while one bid references the file.
      const legacy = path.startsWith(`bids/${rfpId}/`) && path.split("/").length === 3 && rows.length === 1
      if (!isBidAttachmentPath(path, rfpId, bidVendorId) && !legacy) continue
      const rfpRow = b.rfps as unknown as { buyer_id: string } | { buyer_id: string }[] | null
      const ownerId = Array.isArray(rfpRow) ? rfpRow[0]?.buyer_id : rfpRow?.buyer_id
      if ((vendorId && bidVendorId === vendorId) || (profile.role === "buyer" && ownerId === profile.id)) allowed = true
    }
  }

  if (!allowed && bucket === "delivery-docs") {
    const { data: deliveries } = await admin.from("deliveries").select("contract_id, buyer_id, vendor_id").eq("bol_path", path)
    for (const d of deliveries ?? []) {
      if (!isBolPath(path, d.contract_id as string)) continue
      if ((profile.role === "buyer" && d.buyer_id === profile.id) || (vendorId && d.vendor_id === vendorId)) allowed = true
    }
  }

  if (!allowed) return DENIED
  // Anything that isn't a PDF or image downloads rather than rendering on the storage origin.
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 300, { download: !INLINE_SAFE.includes(fileExtension(path)) })
  if (error || !data) return { ok: false, message: "Couldn't generate a download link." }
  return { ok: true, url: data.signedUrl }
}
