"use server"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { siteUrl } from "@/lib/email"

const Schema = z.object({ email: z.email("Enter a valid email address") })

export async function requestPasswordReset(values: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = Schema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid email." }
  if (!isSupabaseConfigured()) return { ok: true }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  })
  if (error) {
    console.error("requestPasswordReset:", error.message)
    // Don't reveal whether the address exists.
  }
  return { ok: true }
}
