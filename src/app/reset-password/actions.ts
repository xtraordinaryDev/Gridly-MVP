"use server"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { roleHomePath, type Role } from "@/lib/auth"

const Schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" })

export async function updatePassword(values: unknown): Promise<{ ok: true; redirectTo: string } | { ok: false; message: string }> {
  const parsed = Schema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid password." }
  if (!isSupabaseConfigured()) return { ok: true, redirectTo: "/login" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Your reset link has expired. Request a new one." }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { ok: false, message: error.message.includes("different") ? "Choose a password you haven't used before." : "Couldn't update your password. Please try again." }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  return { ok: true, redirectTo: roleHomePath(((profile?.role as Role) ?? "buyer")) }
}
