"use server"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { roleHomePath, type Role } from "@/lib/auth"
import { LoginSchema } from "./schema"

export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string }

// Matches DEMO_PASSWORD in scripts/seed-demo-data.ts — accounts created by
// `npm run seed:demo` and `npx tsx scripts/create-demo-logins.ts`.
const DEMO_PASSWORD = "GridLinkDemo2026!"

const DEMO_ACCOUNTS: Record<Role, string> = {
  buyer: "procurement@mercy-health-demo.example.com",
  vendor: "vendor@gridlink-demo.example.com",
  admin: "admin@gridlink-demo.example.com",
}

/**
 * One-click demo sign-in. In preview mode (no Supabase) it just routes to the
 * portal; with Supabase configured it signs in as the seeded demo account.
 */
export async function signInAsDemo(role: Role): Promise<LoginResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, redirectTo: roleHomePath(role) }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_ACCOUNTS[role],
      password: DEMO_PASSWORD,
    })
    if (error) {
      return {
        ok: false,
        message:
          "Demo account not found. Run `npm run seed:demo` and `npx tsx scripts/create-demo-logins.ts` against your Supabase project first.",
      }
    }
    return { ok: true, redirectTo: roleHomePath(role) }
  } catch (err) {
    console.error("signInAsDemo error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}

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
