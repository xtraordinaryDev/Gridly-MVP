"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { BuyerAccessRequestSchema } from "@/lib/schemas/buyer-access-request"
import { sendEmail } from "@/lib/email"

export type RequestResult = { ok: true } | { ok: false; message: string }

export async function requestBuyerAccess(values: unknown): Promise<RequestResult> {
  const parsed = BuyerAccessRequestSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const { fullName, companyName, email, phone, industry, estimatedVolume, useCase } =
    parsed.data

  if (!isSupabaseConfigured()) {
    return { ok: true }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("buyer_applications").insert({
      full_name: fullName,
      company_name: companyName,
      email,
      phone,
      industry,
      estimated_volume: estimatedVolume ?? null,
      use_case: useCase,
      status: "pending_review",
      submitted_at: new Date().toISOString(),
    })

    if (error) {
      console.error("requestBuyerAccess error:", error.message)
      return { ok: false, message: "Couldn't submit your request. Please try again." }
    }

    await sendEmail({
      to: email,
      template: "buyer-access-request-received",
      data: { contactName: fullName, companyName },
    })

    return { ok: true }
  } catch (err) {
    console.error("requestBuyerAccess error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}
