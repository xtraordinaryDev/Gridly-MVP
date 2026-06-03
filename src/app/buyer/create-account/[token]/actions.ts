"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { CreateBuyerAccountSchema } from "./schema"

export type CreateAccountResult = { ok: true } | { ok: false; message: string }

export async function createBuyerAccount(
  token: string,
  values: unknown
): Promise<CreateAccountResult> {
  const parsed = CreateBuyerAccountSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  if (!isSupabaseConfigured()) {
    return { ok: true }
  }

  try {
    const admin = createAdminClient()

    const { data: app } = await admin
      .from("buyer_applications")
      .select("id, status, company_name, full_name, email")
      .eq("invitation_token", token)
      .maybeSingle()

    if (!app) return { ok: false, message: "This link is no longer valid." }
    if (app.status !== "approved") {
      return { ok: false, message: "This request hasn't been approved yet." }
    }

    const email = app.email as string | null
    if (!email) {
      return { ok: false, message: "No email is on file for this request." }
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { role: "buyer", company_name: app.company_name },
    })

    if (createError || !created.user) {
      const msg = createError?.message?.includes("already")
        ? "An account already exists for this email. Try signing in."
        : "Couldn't create your account. Please try again."
      return { ok: false, message: msg }
    }

    const userId = created.user.id

    await admin.from("profiles").upsert({
      id: userId,
      role: "buyer",
      full_name: (app.full_name as string) ?? null,
      company_name: app.company_name,
    })

    await admin.from("buyer_organizations").insert({
      name: app.company_name,
      primary_contact_id: userId,
    })

    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    })
    if (signInError) {
      return { ok: false, message: "Account created — please sign in." }
    }

    return { ok: true }
  } catch (err) {
    console.error("createBuyerAccount error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}
