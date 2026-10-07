import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

/** Humans take longer than this to fill a multi-field form; scripts posting straight to the action don't. */
const MIN_FILL_MS = 3000

/**
 * Cheap bot friction for the public forms, no third party involved: a hidden
 * field real users never see, and the time the form was on screen.
 * "honeypot" should be answered like a success so the bot learns nothing.
 */
export function botSignal(meta: unknown): "honeypot" | "too_fast" | null {
  const m = (meta && typeof meta === "object" ? meta : {}) as { trap?: unknown; elapsedMs?: unknown }
  if (typeof m.trap === "string" && m.trap.trim() !== "") return "honeypot"
  if (typeof m.elapsedMs !== "number" || !Number.isFinite(m.elapsedMs) || m.elapsedMs < MIN_FILL_MS) return "too_fast"
  return null
}

export const TOO_FAST_MESSAGE = "That was quick — please review your details and submit again."

/** Escapes LIKE wildcards so an email can be matched case-insensitively with ilike. */
export function likeExact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * Whether a login already exists for this email. The auth admin API has no
 * lookup by email, so this pages through users — fine at this scale, and only
 * the public signup forms call it.
 */
export async function accountExists(admin: SupabaseClient, email: string): Promise<boolean> {
  const target = email.trim().toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) return false
    if (data.users.some((u) => u.email?.toLowerCase() === target)) return true
    if (data.users.length < 1000) return false
  }
  return false
}
