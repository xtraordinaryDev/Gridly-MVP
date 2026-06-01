"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { ProfileSchema } from "./schema"

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

  try {
    const supabase = await createClient()
    const v = parsed.data
    const { error } = await supabase
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
      .eq("id", vendorId)

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
  if (!message.trim()) {
    return { ok: false, message: "Please describe the change you need." }
  }
  // Locked fields (legal entity name, entity type, EIN-tied data) require an
  // admin review. Email notification to the GridLink team is wired in Phase 7.
  console.info(`[change-request] ${field}: ${message}`)
  return { ok: true }
}
