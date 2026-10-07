"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getSessionProfile, requireAdmin } from "@/lib/auth"
import { sendEmail, siteUrl } from "@/lib/email"
import {
  OPEN_STATUSES,
  applicationDocument,
  approvalBlockers,
  rowToDetail,
  type ApplicationStatus,
} from "@/lib/data/applications"
import { isUuid } from "@/lib/storage/paths"
import { VERIFICATION_CHECKLIST } from "./checklist"

export type ActionResult = { ok: true } | { ok: false; message: string }
export type InviteResult =
  | { ok: true; token: string; registrationUrl: string }
  | { ok: false; message: string }

type AdminAction = "approved" | "info_requested" | "rejected" | "invited" | "note"

const NOTE_MAX = 2000

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
    notes: notes ? notes.slice(0, NOTE_MAX) : null,
  })
}

function revalidate(id?: string) {
  revalidatePath("/admin")
  revalidatePath("/admin/applications")
  if (id) revalidatePath(`/admin/applications/${id}`)
}

async function loadApplication(id: string): Promise<Record<string, unknown> | null> {
  if (typeof id !== "string" || !isUuid(id)) return null
  const { data } = await createAdminClient()
    .from("vendor_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  return data ?? null
}

/**
 * Moves an application to `status` only if it is still open, in one statement,
 * so two admins (or two tabs) can't both act on it. False = someone got there first.
 */
async function transition(id: string, status: ApplicationStatus): Promise<boolean> {
  const profile = await getSessionProfile()
  const { data, error } = await createAdminClient()
    .from("vendor_applications")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile?.id ?? null,
    })
    .eq("id", id)
    .in("status", OPEN_STATUSES)
    .select("id")
  if (error) throw new Error(error.message)
  return (data?.length ?? 0) > 0
}

const alreadyDecided = (status: unknown) =>
  `This application has already been ${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "reviewed"}. Refresh to see the latest.`

const VENDOR_DOCUMENT_SLOTS = [
  ["w9", "w9Form"],
  ["coi", "certificateOfInsurance"],
  ["distributor_license", "distributorLicense"],
] as const

export async function approveApplication(
  id: string,
  notes: string,
  checklist: string[] = []
): Promise<ActionResult> {
  await requireAdmin() // server actions are public POST endpoints; the layout guard doesn't cover them
  if (!VERIFICATION_CHECKLIST.every((item) => Array.isArray(checklist) && checklist.includes(item))) {
    return { ok: false, message: "Complete the verification checklist before approving." }
  }
  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const supabase = createAdminClient()
    const app = await loadApplication(id)
    if (!app) return { ok: false, message: "Application not found." }

    const previous = app.status as ApplicationStatus
    if (!OPEN_STATUSES.includes(previous)) return { ok: false, message: alreadyDecided(previous) }

    const detail = rowToDetail(app)
    const missing = approvalBlockers(detail)
    if (missing.length) {
      return { ok: false, message: `Can't approve yet — missing: ${missing.join(", ")}.` }
    }

    // Claim the application before creating anything: a second approval finds it closed.
    if (!(await transition(id, "approved"))) {
      return { ok: false, message: alreadyDecided("approved") }
    }

    // Create the verified vendor (denormalized snapshot). No profile link yet —
    // that happens when the vendor creates an account after approval.
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .insert({
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
      .select("id")
      .single()

    if (vendorError || !vendor) {
      console.error("Failed to create vendor:", vendorError?.message)
      // Reopen it so the approval can be retried rather than leaving an approved application with no vendor.
      await supabase.from("vendor_applications").update({ status: previous }).eq("id", id).eq("status", "approved")
      return { ok: false, message: "Couldn't create the vendor record." }
    }

    // Carry the onboarding documents over so the supplier isn't "W-9 missing" on day one.
    // The files stay where the application put them; only the reference is copied.
    const documents = VENDOR_DOCUMENT_SLOTS.flatMap(([type, key]) => {
      const doc = applicationDocument(detail, key)
      return doc
        ? [{ vendor_id: vendor.id as string, document_type: type, file_url: doc.path, file_name: doc.name.slice(0, 200) }]
        : []
    })
    if (documents.length) {
      const { error: docsError } = await supabase.from("vendor_documents").insert(documents)
      if (docsError) console.error("Failed to copy application documents:", docsError.message)
    }

    const checklistNote = `Verification checklist confirmed (${VERIFICATION_CHECKLIST.length} of ${VERIFICATION_CHECKLIST.length}).`
    await logActivity(id, "approved", [typeof notes === "string" ? notes.trim() : "", checklistNote].filter(Boolean).join(" — "))

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
    revalidatePath("/admin/vendors")
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
  await requireAdmin()
  if (typeof message !== "string" || !message.trim()) {
    return { ok: false, message: "Please describe what's needed." }
  }
  if (message.length > NOTE_MAX) {
    return { ok: false, message: `Keep the request under ${NOTE_MAX.toLocaleString("en-US")} characters.` }
  }
  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const app = await loadApplication(id)
    if (!app) return { ok: false, message: "Application not found." }
    if (!(await transition(id, "info_requested"))) {
      return { ok: false, message: alreadyDecided(app.status) }
    }

    await logActivity(id, "info_requested", message.trim())

    if (app.sales_rep_email) {
      await sendEmail({
        to: app.sales_rep_email as string,
        template: "vendor-info-requested",
        data: {
          contactName: (app.sales_rep_first_name as string) ?? "there",
          companyName: app.company_name as string,
          adminMessage: message.trim(),
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
  await requireAdmin()
  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const app = await loadApplication(id)
    if (!app) return { ok: false, message: "Application not found." }
    if (!(await transition(id, "rejected"))) {
      return { ok: false, message: alreadyDecided(app.status) }
    }

    await logActivity(id, "rejected", (typeof reason === "string" && reason.trim()) || null)

    if (app.sales_rep_email) {
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
  await requireAdmin()
  const companyName = input.companyName?.trim()
  const email = input.email?.trim().toLowerCase()
  if (!companyName || !email) {
    return { ok: false, message: "Company name and email are required." }
  }
  if (companyName.length > 200 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (input.contactName?.length ?? 0) > 120) {
    return { ok: false, message: "Check the company name, contact and email." }
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
