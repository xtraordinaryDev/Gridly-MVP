import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export type Role = "buyer" | "vendor" | "admin"

export interface SessionProfile {
  id: string
  role: Role
  fullName: string | null
  companyName: string | null
}

const PREVIEW_ADMIN: SessionProfile = {
  id: "preview-admin",
  role: "admin",
  fullName: "Avery Chen",
  companyName: "GridLink",
}

const PREVIEW_VENDOR: SessionProfile = {
  id: "preview-vendor",
  role: "vendor",
  fullName: "Marcus Reilly",
  companyName: "Apex Fuel Co.",
}

const PREVIEW_BUYER: SessionProfile = {
  id: "preview-buyer",
  role: "buyer",
  fullName: "Jordan Kim",
  companyName: "Metro Transit Authority",
}

export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, company_name")
    .eq("id", user.id)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id as string,
    role: data.role as Role,
    fullName: (data.full_name as string) ?? null,
    companyName: (data.company_name as string) ?? null,
  }
}

/**
 * Guards admin routes. When Supabase isn't configured, returns a preview admin
 * so the panel stays demoable; otherwise redirects non-admins to /login.
 */
export async function requireAdmin(): Promise<{
  profile: SessionProfile
  preview: boolean
}> {
  if (!isSupabaseConfigured()) {
    return { profile: PREVIEW_ADMIN, preview: true }
  }

  const profile = await getSessionProfile()
  if (!profile || profile.role !== "admin") {
    redirect("/login")
  }

  return { profile, preview: false }
}

/**
 * Guards vendor-portal routes. Preview mode (no Supabase) returns a demo vendor
 * profile; otherwise non-vendors are redirected to /login.
 */
export async function requireVendor(): Promise<{
  profile: SessionProfile
  preview: boolean
}> {
  if (!isSupabaseConfigured()) {
    return { profile: PREVIEW_VENDOR, preview: true }
  }

  const profile = await getSessionProfile()
  if (!profile || profile.role !== "vendor") {
    redirect("/login")
  }

  return { profile, preview: false }
}

/**
 * Guards buyer-portal routes. Preview mode returns a demo buyer profile.
 */
export async function requireBuyer(): Promise<{
  profile: SessionProfile
  preview: boolean
}> {
  if (!isSupabaseConfigured()) {
    return { profile: PREVIEW_BUYER, preview: true }
  }

  const profile = await getSessionProfile()
  if (!profile || profile.role !== "buyer") {
    redirect("/login")
  }

  return { profile, preview: false }
}

/** Post-login redirect by role. */
export function roleHomePath(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin"
    case "vendor":
      return "/vendor/dashboard"
    case "buyer":
    default:
      return "/buyer/dashboard"
  }
}
