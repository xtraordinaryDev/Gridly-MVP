"use server"

import { requireBuyer } from "@/lib/auth"
import { RfpWizardSchema } from "@/lib/schemas/rfp-wizard"
import { awardRfpContract, saveRfpFromWizard } from "@/lib/data/rfps"

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
