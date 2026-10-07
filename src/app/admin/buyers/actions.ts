"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getSessionProfile, requireAdmin } from "@/lib/auth"
import { sendEmail, siteUrl } from "@/lib/email"
import { isUuid } from "@/lib/storage/paths"

export type ActionResult = { ok: true } | { ok: false; message: string }

function revalidate(id?: string) {
  revalidatePath("/admin")
  revalidatePath("/admin/buyers")
  if (id) revalidatePath(`/admin/buyers/${id}`)
}

type BuyerDecision = "approved" | "rejected"

const OPEN_STATUSES = ["pending_review", "info_requested"]
const NOTE_MAX = 2000

/**
 * Decides a request only if it is still open, in one statement, so a second
 * click or a second admin can't decide it again (and re-send the email).
 */
async function decide(id: string, status: BuyerDecision, notes: string) {
  if (typeof id !== "string" || !isUuid(id)) return { state: "missing" as const }
  const supabase = createAdminClient()
  const profile = await getSessionProfile()
  const base = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: profile?.id ?? null,
  }
  const note = typeof notes === "string" && notes.trim() ? notes.trim().slice(0, NOTE_MAX) : null
  const run = (values: Record<string, unknown>) =>
    supabase
      .from("buyer_applications")
      .update(values)
      .eq("id", id)
      .in("status", OPEN_STATUSES)
      .select("full_name, company_name, email, invitation_token")

  let { data, error } = await run({ ...base, review_notes: note })
  // review_notes arrives with migration 0018; until it's applied, decide without the note.
  if (error) ({ data, error } = await run(base))
  if (error) throw new Error(error.message)
  if (data?.length) return { state: "done" as const, app: data[0] }

  const { data: existing } = await supabase.from("buyer_applications").select("status").eq("id", id).maybeSingle()
  return existing ? { state: "closed" as const, status: existing.status as string } : { state: "missing" as const }
}

const alreadyDecided = (status: string) =>
  `This request has already been ${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "reviewed"}. Refresh to see the latest.`

export async function approveBuyer(id: string, notes: string): Promise<ActionResult> {
  await requireAdmin() // server actions are public POST endpoints; the layout guard doesn't cover them
  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const res = await decide(id, "approved", notes)
    if (res.state === "missing") return { ok: false, message: "Request not found." }
    if (res.state === "closed") return { ok: false, message: alreadyDecided(res.status) }

    const app = res.app
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
  await requireAdmin()
  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const res = await decide(id, "rejected", reason)
    if (res.state === "missing") return { ok: false, message: "Request not found." }
    if (res.state === "closed") return { ok: false, message: alreadyDecided(res.status) }

    const app = res.app
    if (app.email) {
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
