"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getSessionProfile, type Role } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { postMessage } from "@/lib/data/messages"

const Schema = z.object({
  threadType: z.enum(["rfp", "contract", "invoice"]),
  threadId: z.string().min(1),
  vendorId: z.string().optional().or(z.literal("")),
  body: z.string().trim().min(1, "Write a message first").max(4000, "Keep it under 4000 characters"),
  broadcast: z.boolean().optional(),
})

export async function sendThreadMessage(values: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = Schema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid message." }

  let role: Role = "buyer"
  let id = "preview-buyer"
  let profileId: string | null = null
  if (isSupabaseConfigured()) {
    const profile = await getSessionProfile()
    if (!profile) return { ok: false, message: "Sign in to send messages." }
    role = profile.role
    profileId = profile.id
    id = role === "vendor" ? await resolveVendorIdForSession(profile.id, false) : profile.id
  } else if (parsed.data.threadType !== "rfp" || parsed.data.vendorId === "vendor-apex" || parsed.data.broadcast) {
    role = "buyer"
  }

  const res = await postMessage({ role, id, profileId }, { ...parsed.data, vendorId: parsed.data.vendorId || null })
  if (res.ok) {
    const t = parsed.data.threadType
    const paths = t === "rfp" ? [`/buyer/rfps/${parsed.data.threadId}`, `/vendor/opportunities/${parsed.data.threadId}`] : t === "contract" ? [`/buyer/contracts/${parsed.data.threadId}`, `/vendor/contracts/${parsed.data.threadId}`] : [`/buyer/invoices/${parsed.data.threadId}`, `/vendor/invoices/${parsed.data.threadId}`]
    for (const p of paths) revalidatePath(p)
  }
  return res
}
