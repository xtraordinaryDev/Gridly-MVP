"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getSessionProfile } from "@/lib/auth"
import { sendEmail, siteUrl } from "@/lib/email"

export type ActionResult = { ok: true } | { ok: false; message: string }
export type InviteResult =
  | { ok: true; token: string; registrationUrl: string }
  | { ok: false; message: string }

type AdminAction = "approved" | "info_requested" | "rejected" | "invited" | "note"

async function logActivity(
  applicationId: string,
  action: AdminAction,
  notes: string | null
) {
  const supabase = createAdminClient()
  const profile = await getSessionProfile()
  await supabase.from("application_activity_log").insert({
    application_id: applicationId,
    admin_id: profile?.id ?? null,
    action,
    notes,
  })
}

function revalidate(id?: string) {
  revalidatePath("/admin")
  revalidatePath("/admin/applications")
  if (id) revalidatePath(`/admin/applications/${id}`)
}

export async function approveApplication(
  id: string,
  notes: string
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const supabase = createAdminClient()
    const { data: app, error } = await supabase
      .from("vendor_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error || !app) return { ok: false, message: "Application not found." }

    // Create the verified vendor (denormalized snapshot). No profile link yet —
    // that happens when the vendor creates an account after approval.
    const { error: vendorError } = await supabase.from("vendors").insert({
      application_id: app.id,
      is_verified: true,
      verified_at: new Date().toISOString(),
      company_name: app.company_name,
      description: app.description ?? null,
      corporate_address: app.corporate_address ?? null,
      state_of_incorporation: app.state_of_incorporation ?? null,
      entity_type: app.entity_type ?? null,
      organization_type: app.organization_type ?? [],
      special_certification: app.special_certification ?? null,
      nationwide: app.nationwide ?? false,
      us_dot_number: app.us_dot_number ?? null,
      website_url: app.website_url ?? null,
      year_founded: app.year_founded ?? null,
      products_offered: app.products_offered ?? [],
      brands_offered: app.brands_offered ?? null,
      delivery_capabilities: app.delivery_capabilities ?? [],
      additional_services: app.additional_services ?? [],
      licensed_states: app.licensed_states ?? [],
      tankwagons_count: app.tankwagons_count ?? null,
      transports_count: app.transports_count ?? null,
      annual_gallons_distributed: app.annual_gallons_distributed ?? null,
      standard_order_lead_time: app.standard_order_lead_time ?? null,
      emergency_order_lead_time: app.emergency_order_lead_time ?? null,
      emergency_response_times: app.emergency_response_times ?? null,
    })

    if (vendorError) {
      console.error("Failed to create vendor:", vendorError.message)
      return { ok: false, message: "Couldn't create the vendor record." }
    }

    const profile = await getSessionProfile()
    await supabase
      .from("vendor_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile?.id ?? null,
      })
      .eq("id", id)

    await logActivity(id, "approved", notes || null)

    const email = app.sales_rep_email as string | null
    if (email) {
      await sendEmail({
        to: email,
        template: "vendor-approved-create-account",
        data: {
          contactName: (app.sales_rep_first_name as string) ?? "there",
          companyName: app.company_name as string,
          createAccountUrl: `${siteUrl()}/vendor/create-account/${app.invitation_token as string}`,
        },
      })
    }

    revalidate(id)
    return { ok: true }
  } catch (err) {
    console.error("approveApplication error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}

export async function requestMoreInfo(
  id: string,
  message: string
): Promise<ActionResult> {
  if (!message.trim()) {
    return { ok: false, message: "Please describe what's needed." }
  }
  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const supabase = createAdminClient()
    const profile = await getSessionProfile()
    const { data: app } = await supabase
      .from("vendor_applications")
      .select("company_name, sales_rep_email, sales_rep_first_name, invitation_token")
      .eq("id", id)
      .maybeSingle()

    const { error } = await supabase
      .from("vendor_applications")
      .update({
        status: "info_requested",
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile?.id ?? null,
      })
      .eq("id", id)

    if (error) return { ok: false, message: "Couldn't update the application." }

    await logActivity(id, "info_requested", message)

    if (app?.sales_rep_email) {
      await sendEmail({
        to: app.sales_rep_email as string,
        template: "vendor-info-requested",
        data: {
          contactName: (app.sales_rep_first_name as string) ?? "there",
          companyName: app.company_name as string,
          adminMessage: message,
          registrationUrl: `${siteUrl()}/vendor-registration/${app.invitation_token as string}`,
        },
      })
    }

    revalidate(id)
    return { ok: true }
  } catch (err) {
    console.error("requestMoreInfo error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}

export async function rejectApplication(
  id: string,
  reason: string
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const supabase = createAdminClient()
    const profile = await getSessionProfile()
    const { data: app } = await supabase
      .from("vendor_applications")
      .select("company_name, sales_rep_email, sales_rep_first_name")
      .eq("id", id)
      .maybeSingle()

    const { error } = await supabase
      .from("vendor_applications")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile?.id ?? null,
      })
      .eq("id", id)

    if (error) return { ok: false, message: "Couldn't update the application." }

    await logActivity(id, "rejected", reason || null)

    if (app?.sales_rep_email) {
      await sendEmail({
        to: app.sales_rep_email as string,
        template: "vendor-rejected",
        data: {
          contactName: (app.sales_rep_first_name as string) ?? "there",
          companyName: app.company_name as string,
        },
      })
    }

    revalidate(id)
    return { ok: true }
  } catch (err) {
    console.error("rejectApplication error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}

export async function inviteSupplier(input: {
  companyName: string
  contactName: string
  email: string
  note?: string
}): Promise<InviteResult> {
  const companyName = input.companyName?.trim()
  const email = input.email?.trim()
  if (!companyName || !email) {
    return { ok: false, message: "Company name and email are required." }
  }

  const token = randomUUID()
  const registrationUrl = `${siteUrl()}/vendor-registration/${token}`

  if (!isSupabaseConfigured()) {
    await sendEmail({
      to: email,
      template: "vendor-onboarding-invite",
      data: {
        contactName: input.contactName?.trim() || "there",
        companyName,
        registrationUrl,
      },
    })
    return { ok: true, token, registrationUrl }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("vendor_applications")
      .insert({
        invitation_token: token,
        company_name: companyName,
        sales_rep_email: email,
        sales_rep_first_name: input.contactName?.trim() || null,
        source: "invited",
        status: "pending_review",
      })
      .select("id")
      .single()

    if (error || !data) {
      console.error("inviteSupplier error:", error?.message)
      return { ok: false, message: "Couldn't create the invitation." }
    }

    await logActivity(data.id as string, "invited", input.note?.trim() || null)

    await sendEmail({
      to: email,
      template: "vendor-onboarding-invite",
      data: {
        contactName: input.contactName?.trim() || "there",
        companyName,
        registrationUrl,
      },
    })

    revalidate()
    return { ok: true, token, registrationUrl }
  } catch (err) {
    console.error("inviteSupplier error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}
