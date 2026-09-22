"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { recordVendorDocument, signedDocumentUrl } from "@/lib/data/documents"

const Schema = z.object({
  type: z.enum(["w9", "coi", "distributor_license", "dot", "certification", "other"]),
  path: z.string().min(1),
  fileName: z.string().min(1),
  expiresAt: z.string().optional().or(z.literal("")),
})

export async function saveUploadedDocument(values: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = Schema.safeParse(values)
  if (!parsed.success) return { ok: false, message: "Invalid upload." }
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const res = await recordVendorDocument(vendorId, { ...parsed.data, expiresAt: parsed.data.expiresAt || null })
  if (res.ok) revalidatePath("/vendor/documents")
  return res
}

/** Returns a short-lived download URL for one of the vendor's own documents. */
export async function openDocument(documentId: string): Promise<never> {
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const url = await signedDocumentUrl(vendorId, documentId)
  redirect(url ?? "/vendor/documents")
}
