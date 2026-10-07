"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { DOCUMENT_TYPES, recordVendorDocument } from "@/lib/data/documents"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { isUuid } from "@/lib/storage/paths"
import { issueUploadTicket, parseFileInfo, type UploadTicketResult } from "@/lib/storage/uploads"

const TYPES = ["w9", "coi", "distributor_license", "dot", "certification", "other"] as const

const Schema = z.object({
  type: z.enum(TYPES),
  path: z.string().min(1).max(400),
  fileName: z.string().trim().min(1).max(300),
  expiresAt: z.string().max(10).optional(),
})

/** Authorises one upload into the signed-in vendor's own folder. */
export async function createDocumentUpload(type: unknown, file: unknown, expiresAt?: unknown): Promise<UploadTicketResult> {
  const spec = DOCUMENT_TYPES.find((t) => t.type === type)
  const info = parseFileInfo(file)
  if (!spec || !info || !isSupabaseConfigured()) return { ok: false, message: "Invalid upload." }
  // Checked again when the upload is recorded; asking here saves a wasted upload.
  if (spec.expiryRequired && !expiresAt) return { ok: false, message: `Enter the expiry date for your ${spec.label} first.` }
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  if (!isUuid(vendorId)) return { ok: false, message: "Your supplier profile isn't linked to this account yet." }
  return issueUploadTicket("document", `vendors/${vendorId}/${spec.type}`, info)
}

export async function saveUploadedDocument(values: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = Schema.safeParse(values)
  if (!parsed.success) return { ok: false, message: "Invalid upload." }
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  // "" means the vendor cleared the date; undefined (not sent) keeps the old one.
  const expiresAt = parsed.data.expiresAt === undefined ? undefined : parsed.data.expiresAt || null
  const res = await recordVendorDocument(vendorId, { type: parsed.data.type, path: parsed.data.path, fileName: parsed.data.fileName, expiresAt })
  if (res.ok) revalidatePath("/vendor/documents")
  return res
}
