"use server"

import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { botSignal } from "@/lib/forms/public-form"
import { EMAIL_RE } from "@/lib/updates/html"

export type SubscribeResult = { ok: true } | { ok: false; message: string }

const SubscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "That email address is too long.")
    .refine((v) => EMAIL_RE.test(v), "Enter a valid email address."),
  name: z.string().trim().max(120, "Name is too long.").optional().or(z.literal("")),
})

/** A single email field takes a person a second or two; a script posts instantly. */
const MIN_FILL_MS = 1200

/**
 * Public newsletter sign-up from the marketing site. Adds the address to
 * update_contacts as a prospect. Someone who unsubscribed earlier and signs
 * up again is deliberately opting back in, so their status returns to active.
 */
export async function subscribeToUpdates(values: unknown, meta?: unknown): Promise<SubscribeResult> {
  if (botSignal(meta) === "honeypot") return { ok: true }
  const elapsed = (meta && typeof meta === "object" && typeof (meta as { elapsedMs?: unknown }).elapsedMs === "number")
    ? (meta as { elapsedMs: number }).elapsedMs
    : 0
  if (elapsed < MIN_FILL_MS) return { ok: false, message: "Please try that again." }

  const parsed = SubscribeSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Enter a valid email address." }
  const email = parsed.data.email
  const name = parsed.data.name ? parsed.data.name : null

  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const admin = createAdminClient()
    const { data: existing } = await admin
      .from("update_contacts")
      .select("id, status, full_name")
      .ilike("email", email.replace(/[\\%_]/g, (c) => `\\${c}`))
      .maybeSingle()

    if (existing) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (existing.status !== "active") patch.status = "active"
      if (name && !existing.full_name) patch.full_name = name
      if (Object.keys(patch).length > 1) await admin.from("update_contacts").update(patch).eq("id", existing.id)
      return { ok: true }
    }

    const { error } = await admin.from("update_contacts").insert({
      email,
      full_name: name,
      contact_type: "prospect",
      notes: "Signed up on gridlink.global",
    })
    if (error) {
      // A race with the unique index on lower(email) means they're already on the list.
      if (error.code === "23505") return { ok: true }
      console.error("[updates] subscribe:", error.message)
      return { ok: false, message: "Couldn't save your address right now. Email hello@gridlink.global and we'll add you." }
    }
    return { ok: true }
  } catch (err) {
    console.error("[updates] subscribe:", err)
    return { ok: false, message: "Couldn't save your address right now. Email hello@gridlink.global and we'll add you." }
  }
}
