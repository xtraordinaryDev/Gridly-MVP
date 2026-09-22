"use server"

import { requireBuyer } from "@/lib/auth"
import { RfpWizardSchema } from "@/lib/schemas/rfp-wizard"
import { revalidatePath } from "next/cache"

import {
  awardRfpContract,
  cancelRfp,
  closeRfpBidding,
  duplicateRfp,
  extendRfpDeadline,
  saveRfpFromWizard,
} from "@/lib/data/rfps"

function revalidate(id?: string) {
  revalidatePath("/buyer/rfps")
  revalidatePath("/buyer/dashboard")
  revalidatePath("/vendor/opportunities")
  if (id) {
    revalidatePath(`/buyer/rfps/${id}`)
    revalidatePath(`/vendor/opportunities/${id}`)
  }
}

export type ActionResult = { ok: true; rfpId?: string } | { ok: false; message: string }

export async function saveRfpDraft(values: unknown): Promise<ActionResult> {
  const { profile } = await requireBuyer()
  const parsed = RfpWizardSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid form data." }
  }

  const result = await saveRfpFromWizard(
    profile.id,
    profile.companyName ?? "Buyer",
    parsed.data,
    false
  )
  if (!result.ok) return result
  return { ok: true, rfpId: result.rfpId }
}

export async function publishRfp(values: unknown): Promise<ActionResult> {
  const { profile } = await requireBuyer()
  const parsed = RfpWizardSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid form data." }
  }

  const result = await saveRfpFromWizard(
    profile.id,
    profile.companyName ?? "Buyer",
    parsed.data,
    true
  )
  return result
}

export async function awardContract(
  rfpId: string,
  vendorId: string
): Promise<ActionResult> {
  const { profile } = await requireBuyer()
  const result = await awardRfpContract(profile.id, rfpId, vendorId)
  return result
}

export async function updateRfpDraft(rfpId: string, values: unknown): Promise<ActionResult> {
  const { profile } = await requireBuyer()
  const parsed = RfpWizardSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid form data." }
  const result = await saveRfpFromWizard(profile.id, profile.companyName ?? "Buyer", parsed.data, false, rfpId)
  if (result.ok) revalidate(rfpId)
  return result
}

export async function publishRfpDraft(rfpId: string, values: unknown): Promise<ActionResult> {
  const { profile } = await requireBuyer()
  const parsed = RfpWizardSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid form data." }
  const result = await saveRfpFromWizard(profile.id, profile.companyName ?? "Buyer", parsed.data, true, rfpId)
  if (result.ok) revalidate(rfpId)
  return result
}

export async function closeBidding(rfpId: string): Promise<ActionResult> {
  const { profile } = await requireBuyer()
  const res = await closeRfpBidding(profile.id, rfpId)
  if (res.ok) revalidate(rfpId)
  return res
}

export async function cancelRfpAction(rfpId: string): Promise<ActionResult> {
  const { profile } = await requireBuyer()
  const res = await cancelRfp(profile.id, rfpId)
  if (res.ok) revalidate(rfpId)
  return res
}

export async function extendDeadline(rfpId: string, newDueDate: string): Promise<ActionResult> {
  const { profile } = await requireBuyer()
  const res = await extendRfpDeadline(profile.id, rfpId, newDueDate)
  if (res.ok) revalidate(rfpId)
  return res
}

export async function duplicateRfpAction(rfpId: string): Promise<ActionResult> {
  const { profile } = await requireBuyer()
  const res = await duplicateRfp(profile.id, rfpId)
  if (res.ok) revalidate()
  return res
}
