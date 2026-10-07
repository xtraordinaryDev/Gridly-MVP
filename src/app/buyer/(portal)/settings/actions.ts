"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireBuyer } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { addBuyerSite, removeBuyerSite } from "@/lib/data/sites"
import { US_STATES } from "@/lib/schemas/vendor-application"

type Result = { ok: true } | { ok: false; message: string }

const ProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Your name is required").max(120, "Keep your name under 120 characters"),
  companyName: z.string().trim().min(1, "Organization name is required").max(200, "Keep the organization name under 200 characters"),
})

export async function updateBuyerProfile(values: unknown): Promise<Result> {
  const parsed = ProfileSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  const { profile } = await requireBuyer()
  if (!isSupabaseConfigured()) return { ok: true }

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update({ full_name: parsed.data.fullName, company_name: parsed.data.companyName }).eq("id", profile.id)
  if (error) return { ok: false, message: "Couldn't save your profile." }
  await admin.from("buyer_organizations").update({ name: parsed.data.companyName }).eq("primary_contact_id", profile.id)
  revalidatePath("/buyer", "layout")
  return { ok: true }
}

const SiteSchema = z.object({
  name: z.string().trim().min(1, "Site name is required").max(120, "Keep the site name under 120 characters"),
  address: z.string().trim().min(5, "Enter the full address").max(300, "That address is too long"),
  state: z.enum(US_STATES).optional().or(z.literal("")),
})

export async function addSite(values: unknown): Promise<Result> {
  const parsed = SiteSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid site." }
  const { profile } = await requireBuyer()
  const res = await addBuyerSite(profile.id, { name: parsed.data.name, address: parsed.data.address, state: parsed.data.state || null })
  if (res.ok) {
    revalidatePath("/buyer/settings")
    revalidatePath("/buyer/rfps/new")
  }
  return res
}

export async function removeSite(siteId: string): Promise<Result> {
  const { profile } = await requireBuyer()
  const res = await removeBuyerSite(profile.id, siteId)
  if (res.ok) {
    revalidatePath("/buyer/settings")
    revalidatePath("/buyer/rfps/new")
  }
  return res
}
