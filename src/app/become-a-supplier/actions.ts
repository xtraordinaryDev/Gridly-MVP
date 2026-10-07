"use server"

import { SupplierInterestSchema } from "@/lib/schemas/supplier-interest"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { sendEmail } from "@/lib/email"
import { TOO_FAST_MESSAGE, accountExists, botSignal, likeExact } from "@/lib/forms/public-form"

export type SubmitInterestResult =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Public, unauthenticated submission of the "Become a Supplier" interest form.
 * Runs with the service role (bypassing RLS) to create a pending
 * vendor_applications row. Validated server-side regardless of client checks.
 */
export async function submitSupplierInterest(
  values: unknown,
  meta?: unknown
): Promise<SubmitInterestResult> {
  const bot = botSignal(meta)
  if (bot === "honeypot") return { ok: true }
  if (bot === "too_fast") return { ok: false, message: TOO_FAST_MESSAGE }

  const parsed = SupplierInterestSchema.safeParse(values)

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Some fields need attention. Please review and try again.",
    }
  }

  const data = { ...parsed.data, email: parsed.data.email.trim().toLowerCase() }

  if (!isSupabaseConfigured()) {
    return { ok: true }
  }

  try {
    const supabase = createAdminClient()

    const { data: prior } = await supabase
      .from("vendor_applications")
      .select("status")
      .ilike("sales_rep_email", likeExact(data.email))
    const statuses = (prior ?? []).map((p) => p.status as string)
    if (statuses.some((st) => st === "pending_review" || st === "info_requested")) {
      return {
        ok: false,
        message:
          "We already have an application for this email. If we sent you a registration link, please use that; otherwise we'll be in touch soon.",
      }
    }
    // Already approved or already has a login: answer exactly like a new
    // application so the form can't be used to find out which emails have accounts.
    if (statuses.includes("approved") || (await accountExists(supabase, data.email))) {
      return { ok: true }
    }

    const { error } = await supabase.from("vendor_applications").insert({
      company_name: data.companyName,
      source: "self_applied",
      status: "pending_review",
      submitted_at: new Date().toISOString(),
      website_url: data.website || null,
      licensed_states: data.statesServed,
      products_offered: data.productsOffered,
      annual_gallons_range: data.annualGallons,
      description: data.description,
      sales_rep_first_name: data.contactName,
      sales_rep_email: data.email,
      sales_rep_phone: data.phone,
    })

    if (error) {
      console.error("Failed to insert vendor application:", error.message)
      return {
        ok: false,
        message: "We couldn't submit your application. Please try again.",
      }
    }

    await sendEmail({
      to: data.email,
      template: "vendor-application-received",
      data: {
        contactName: data.contactName,
        companyName: data.companyName,
      },
    })

    return { ok: true }
  } catch (err) {
    console.error("Supplier interest submission error:", err)
    return {
      ok: false,
      message:
        "Submissions aren't available right now. Please try again shortly.",
    }
  }
}
