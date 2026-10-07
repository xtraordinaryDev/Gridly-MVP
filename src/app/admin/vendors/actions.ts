"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getSessionProfile, requireAdmin } from "@/lib/auth"
import { isUuid } from "@/lib/storage/paths"

export type ActionResult = { ok: true } | { ok: false; message: string }

/**
 * Suspends or restores a supplier's verification. Suspended vendors drop out of
 * the buyer directory and public profile (both filter on is_verified); the
 * record, documents and history stay.
 */
export async function setVendorVerification(id: string, verified: boolean, reason: string): Promise<ActionResult> {
  await requireAdmin() // server actions are public POST endpoints; the layout guard doesn't cover them
  if (typeof verified !== "boolean") return { ok: false, message: "Invalid request." }
  if (!isSupabaseConfigured()) return { ok: true }
  if (typeof id !== "string" || !isUuid(id)) return { ok: false, message: "Vendor not found." }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("vendors")
      .update({ is_verified: verified })
      .eq("id", id)
      .eq("is_verified", !verified)
      .select("id, application_id, verified_at")

    if (error) return { ok: false, message: "Couldn't update the vendor." }
    if (!data?.length) {
      const { data: existing } = await supabase.from("vendors").select("id").eq("id", id).maybeSingle()
      return existing
        ? { ok: false, message: verified ? "This vendor is already verified." : "This vendor is already suspended." }
        : { ok: false, message: "Vendor not found." }
    }

    const vendor = data[0]
    if (verified && !vendor.verified_at) {
      await supabase.from("vendors").update({ verified_at: new Date().toISOString() }).eq("id", id)
    }

    // Vendors that came through an application share its audit trail.
    if (vendor.application_id) {
      const profile = await getSessionProfile()
      const note = typeof reason === "string" && reason.trim() ? ` — ${reason.trim().slice(0, 1500)}` : ""
      await supabase.from("application_activity_log").insert({
        application_id: vendor.application_id,
        admin_id: profile?.id ?? null,
        action: "note",
        notes: `${verified ? "Verification restored" : "Verification suspended"}${note}`,
      })
      revalidatePath(`/admin/applications/${vendor.application_id as string}`)
    }

    revalidatePath("/admin")
    revalidatePath("/admin/vendors")
    revalidatePath(`/admin/vendors/${id}`)
    revalidatePath("/admin/compliance")
    revalidatePath("/buyer/directory")
    return { ok: true }
  } catch (err) {
    console.error("setVendorVerification error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}
