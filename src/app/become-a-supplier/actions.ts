"use server"

import { SupplierInterestSchema } from "@/lib/schemas/supplier-interest"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"

export type SubmitInterestResult =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Public, unauthenticated submission of the "Become a Supplier" interest form.
 * Runs with the service role (bypassing RLS) to create a pending
 * vendor_applications row. Validated server-side regardless of client checks.
 */
export async function submitSupplierInterest(
  values: unknown
): Promise<SubmitInterestResult> {
  const parsed = SupplierInterestSchema.safeParse(values)

  if (!parsed.success) {
    return {
      ok: false,
      message: "Some fields need attention. Please review and try again.",
    }
  }

  const data = parsed.data

  try {
    const supabase = createAdminClient()

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
