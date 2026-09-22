"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireBuyer } from "@/lib/auth"
import { rateContract } from "@/lib/data/ratings"

const Schema = z.object({
  contractId: z.string().min(1),
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
})

export async function rateSupplier(values: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = Schema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid rating." }
  const { profile } = await requireBuyer()
  const res = await rateContract(profile.id, parsed.data.contractId, parsed.data.stars, parsed.data.comment || undefined)
  if (res.ok) {
    revalidatePath(`/buyer/contracts/${parsed.data.contractId}`)
    revalidatePath(`/vendor/contracts/${parsed.data.contractId}`)
    revalidatePath("/buyer/directory")
  }
  return res
}
