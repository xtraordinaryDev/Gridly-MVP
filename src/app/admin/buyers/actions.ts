"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getSessionProfile } from "@/lib/auth"
import { sendEmail, siteUrl } from "@/lib/email"

export type ActionResult = { ok: true } | { ok: false; message: string }

function revalidate(id?: string) {
  revalidatePath("/admin")
  revalidatePath("/admin/buyers")
  if (id) revalidatePath(`/admin/buyers/${id}`)
}

export async function approveBuyer(id: string, notes: string): Promise<ActionResult> {
  void notes
  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const supabase = createAdminClient()
    const { data: app } = await supabase
      .from("buyer_applications")
      .select("full_name, company_name, email, invitation_token, status")
      .eq("id", id)
      .maybeSingle()

    if (!app) return { ok: false, message: "Request not found." }

    const profile = await getSessionProfile()
    const { error } = await supabase
      .from("buyer_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile?.id ?? null,
      })
      .eq("id", id)

    if (error) return { ok: false, message: "Couldn't update the request." }

    if (app.email) {
      await sendEmail({
        to: app.email as string,
        template: "buyer-approved-create-account",
        data: {
          contactName: (app.full_name as string) ?? "there",
          companyName: app.company_name as string,
          createAccountUrl: `${siteUrl()}/buyer/create-account/${app.invitation_token as string}`,
        },
      })
    }

    revalidate(id)
    return { ok: true }
  } catch (err) {
    console.error("approveBuyer error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}

export async function rejectBuyer(id: string, reason: string): Promise<ActionResult> {
  void reason
  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const supabase = createAdminClient()
    const { data: app } = await supabase
      .from("buyer_applications")
      .select("full_name, company_name, email")
      .eq("id", id)
      .maybeSingle()

    const profile = await getSessionProfile()
    const { error } = await supabase
      .from("buyer_applications")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile?.id ?? null,
      })
      .eq("id", id)

    if (error) return { ok: false, message: "Couldn't update the request." }

    if (app?.email) {
      await sendEmail({
        to: app.email as string,
        template: "buyer-rejected",
        data: {
          contactName: (app.full_name as string) ?? "there",
          companyName: app.company_name as string,
        },
      })
    }

    revalidate(id)
    return { ok: true }
  } catch (err) {
    console.error("rejectBuyer error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}
