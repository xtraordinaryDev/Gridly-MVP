"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { BuyerAccessRequestSchema } from "@/lib/schemas/buyer-access-request"
import { sendEmail } from "@/lib/email"
import { TOO_FAST_MESSAGE, accountExists, botSignal, likeExact } from "@/lib/forms/public-form"

export type RequestResult = { ok: true } | { ok: false; message: string }

export async function requestBuyerAccess(values: unknown, meta?: unknown): Promise<RequestResult> {
  const bot = botSignal(meta)
  if (bot === "honeypot") return { ok: true }
  if (bot === "too_fast") return { ok: false, message: TOO_FAST_MESSAGE }

  const parsed = BuyerAccessRequestSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const { fullName, companyName, phone, industry, estimatedVolume, useCase } = parsed.data
  const email = parsed.data.email.trim().toLowerCase()

  if (!isSupabaseConfigured()) {
    return { ok: true }
  }

  try {
    const admin = createAdminClient()

    const { data: prior } = await admin
      .from("buyer_applications")
      .select("status")
      .ilike("email", likeExact(email))
    const statuses = (prior ?? []).map((p) => p.status as string)
    if (statuses.some((st) => st === "pending_review" || st === "info_requested")) {
      return {
        ok: false,
        message: "We already have your request and it's in review — we'll email you as soon as there's a decision.",
      }
    }
    // Already approved or already has a login: answer exactly like a new request
    // so the form can't be used to find out which emails have accounts.
    if (statuses.includes("approved") || (await accountExists(admin, email))) {
      return { ok: true }
    }

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
