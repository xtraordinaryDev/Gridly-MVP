"use server"

import { revalidatePath } from "next/cache"

import { requireVendor } from "@/lib/auth"
import { RfpBidSchema } from "@/lib/schemas/rfp-wizard"
import {
  declineVendorInvitation,
  resolveVendorIdForSession,
  submitVendorBid,
} from "@/lib/data/rfps"

export type VendorActionResult = { ok: true } | { ok: false; message: string }

export async function submitBid(
  rfpId: string,
  values: unknown
): Promise<VendorActionResult> {
  const { profile, preview } = await requireVendor()
  const parsed = RfpBidSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid bid." }
  }

  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const result = await submitVendorBid(vendorId, rfpId, parsed.data)
  if (result.ok) {
    revalidatePath(`/vendor/opportunities/${rfpId}`)
    revalidatePath("/vendor/opportunities")
  }
  return result
}

export async function declineOpportunity(rfpId: string): Promise<VendorActionResult> {
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const result = await declineVendorInvitation(vendorId, rfpId)
  if (result.ok) {
    revalidatePath(`/vendor/opportunities/${rfpId}`)
    revalidatePath("/vendor/opportunities")
  }
  return result
}
