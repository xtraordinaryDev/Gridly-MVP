"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { CreateAccountSchema } from "./schema"

export type CreateAccountResult = { ok: true } | { ok: false; message: string }

export async function createVendorAccount(
  token: string,
  values: unknown
): Promise<CreateAccountResult> {
  const parsed = CreateAccountSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  if (!isSupabaseConfigured()) {
    // Preview mode — no real auth; the client redirects to the dashboard.
    return { ok: true }
  }

  try {
    const admin = createAdminClient()

    const { data: app } = await admin
      .from("vendor_applications")
      .select("id, status, company_name, sales_rep_email, sales_rep_first_name, sales_rep_last_name")
      .eq("invitation_token", token)
      .maybeSingle()

    if (!app) return { ok: false, message: "This link is no longer valid." }
    if (app.status !== "approved") {
      return { ok: false, message: "This application hasn't been approved yet." }
    }

    const email = app.sales_rep_email as string | null
    if (!email) {
      return { ok: false, message: "No email is on file for this application." }
    }

    // Create the auth user (email pre-confirmed since the admin approved them).
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { role: "vendor", company_name: app.company_name },
    })

    if (createError || !created.user) {
      const msg = createError?.message?.includes("already")
        ? "An account already exists for this email. Try signing in."
        : "Couldn't create your account. Please try again."
      return { ok: false, message: msg }
    }

    const userId = created.user.id
    const fullName = [app.sales_rep_first_name, app.sales_rep_last_name]
      .filter(Boolean)
      .join(" ")

    await admin.from("profiles").upsert({
      id: userId,
      role: "vendor",
      full_name: fullName || null,
      company_name: app.company_name,
    })

    // Link the verified vendor record to the new account.
    await admin
      .from("vendors")
      .update({ profile_id: userId })
      .eq("application_id", app.id)

    // Auto-login by establishing a session on the cookie-bound server client.
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
    console.error("createVendorAccount error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}
