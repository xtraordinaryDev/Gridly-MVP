"use server"

import { revalidatePath } from "next/cache"

import { requireVendor } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { sendProfileChangeRequestEmail } from "@/lib/email/notifications"
import { ChangeRequestSchema, ProfileSchema } from "./schema"

export type ProfileResult = { ok: true } | { ok: false; message: string }

function toNum(value?: string): number | null {
  if (!value || !value.trim()) return null
  const n = Number(value.replace(/,/g, ""))
  return Number.isFinite(n) ? n : null
}

export async function updateVendorProfile(
  vendorId: string,
  values: unknown
): Promise<ProfileResult> {
  const parsed = ProfileSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  if (!isSupabaseConfigured()) return { ok: true }

  // Vendors have no UPDATE policy on their own row (it also holds is_verified
  // and the locked legal fields), so resolve the caller's vendor here and
  // write exactly these columns with the service role.
  const { profile } = await requireVendor()

  try {
    const admin = createAdminClient()
    const { data: own } = await admin.from("vendors").select("id").eq("profile_id", profile.id).maybeSingle()
    if (!own || own.id !== vendorId) return { ok: false, message: "Couldn't save your profile." }
    const v = parsed.data
    const { error } = await admin
      .from("vendors")
      .update({
        website_url: v.website || null,
        corporate_address: v.corporateAddress || null,
        us_dot_number: v.usDotNumber || null,
        year_founded: toNum(v.yearFounded),
        description: v.description || null,
        special_certification: v.specialCertification || null,
        products_offered: v.productsOffered,
        brands_offered: v.brandsOffered || null,
        delivery_capabilities: v.deliveryCapabilities,
        additional_services: v.additionalServices,
        licensed_states: v.licensedStates,
        tankwagons_count: toNum(v.tankwagonsCount),
        transports_count: toNum(v.transportsCount),
        annual_gallons_distributed: toNum(v.annualGallonsDistributed),
        standard_order_lead_time: v.standardOrderLeadTime || null,
      })
      .eq("id", own.id)

    if (error) return { ok: false, message: "Couldn't save your profile." }

    revalidatePath("/vendor/profile")
    revalidatePath("/vendor/dashboard")
    return { ok: true }
  } catch (err) {
    console.error("updateVendorProfile error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}

export async function requestFieldChange(
  field: string,
  message: string
): Promise<ProfileResult> {
  const { profile, preview } = await requireVendor()
  const parsed = ChangeRequestSchema.safeParse({ field, message })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." }
  }
  if (preview) return { ok: true }

  const unavailable = "We couldn't send your request right now. Please email GridLink support instead."
  try {
    const supabase = await createClient()
    const [{ data: vendors }, { data: auth }] = await Promise.all([
      supabase.from("vendors").select("id, company_name, application_id").eq("profile_id", profile.id).order("created_at", { ascending: true }).limit(1),
      supabase.auth.getUser(),
    ])
    const vendor = vendors?.[0]
    if (!vendor) return { ok: false, message: "No supplier record is linked to your account." }

    // Locked fields need an admin review: email the ops inbox and, when the
    // vendor came through an application, note it on that application's log.
    const email = await sendProfileChangeRequestEmail({
      vendorId: vendor.id as string,
      companyName: vendor.company_name as string,
      requestedBy: profile.fullName,
      requesterEmail: auth.user?.email ?? null,
      field: parsed.data.field,
      message: parsed.data.message,
    })

    let logged = false
    if (vendor.application_id) {
      const { error } = await createAdminClient().from("application_activity_log").insert({
        application_id: vendor.application_id,
        admin_id: null,
        action: "note",
        notes: `Vendor change request (${auth.user?.email ?? profile.fullName ?? "vendor"}) — ${parsed.data.field}: ${parsed.data.message}`,
      })
      if (error) console.error("requestFieldChange log error:", error.message)
      logged = !error
    }

    // No ops inbox means nobody would ever see it — say so rather than pretend.
    if (email.status === "no-recipient" || (email.status === "failed" && !logged)) {
      console.error(`requestFieldChange: not delivered (${email.status})`)
      return { ok: false, message: unavailable }
    }
    return { ok: true }
  } catch (err) {
    console.error("requestFieldChange error:", err)
    return { ok: false, message: unavailable }
  }
}
