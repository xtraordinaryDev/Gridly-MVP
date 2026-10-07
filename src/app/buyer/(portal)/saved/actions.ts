"use server"

import { revalidatePath } from "next/cache"

import { requireBuyer } from "@/lib/auth"
import { setSupplierSaved } from "@/lib/data/saved"

export async function toggleSavedSupplier(vendorId: string, saved: boolean): Promise<{ ok: true } | { ok: false; message: string }> {
  const { profile } = await requireBuyer()
  if (typeof vendorId !== "string" || !vendorId || vendorId.length > 64) return { ok: false, message: "Supplier not found." }
  const res = await setSupplierSaved(profile.id, vendorId, Boolean(saved))
  if (res.ok) {
    revalidatePath("/buyer/saved")
    revalidatePath(`/buyer/directory/${vendorId}`)
  }
  return res
}
