"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { BuyerSignupSchema } from "@/lib/schemas/buyer-signup"

export type SignupResult = { ok: true } | { ok: false; message: string }

export async function signUpBuyer(values: unknown): Promise<SignupResult> {
  const parsed = BuyerSignupSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  if (!isSupabaseConfigured()) {
    return { ok: true }
  }

  const { fullName, companyName, email, password } = parsed.data

  try {
    const admin = createAdminClient()
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "buyer", company_name: companyName },
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
      full_name: fullName,
      company_name: companyName,
    })

    await admin.from("buyer_organizations").insert({
      name: companyName,
      primary_contact_id: userId,
    })

    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      return { ok: false, message: "Account created — please sign in." }
    }

    return { ok: true }
  } catch (err) {
    console.error("signUpBuyer error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}
