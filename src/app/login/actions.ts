"use server"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { roleHomePath, type Role } from "@/lib/auth"
import { LoginSchema } from "./schema"

export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string }

export async function signIn(values: unknown): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, redirectTo: "/buyer/dashboard" }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword(parsed.data)
    if (error) {
      return { ok: false, message: "Invalid email or password." }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle()

    const role = (profile?.role as Role) ?? "buyer"
    return { ok: true, redirectTo: roleHomePath(role) }
  } catch (err) {
    console.error("signIn error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}
