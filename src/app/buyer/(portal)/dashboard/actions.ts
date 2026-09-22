"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireBuyer } from "@/lib/auth"
import { setEmissionsTarget } from "@/lib/data/emissions"

const TargetSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  targetTons: z.number().min(0, "Target must be zero or more"),
  note: z.string().trim().optional().or(z.literal("")),
})

export async function saveEmissionsTarget(values: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = TargetSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid target." }
  const { profile } = await requireBuyer()
  const res = await setEmissionsTarget(profile.id, parsed.data.year, parsed.data.targetTons, parsed.data.note || undefined)
  if (res.ok) revalidatePath("/buyer/dashboard")
  return res
}
