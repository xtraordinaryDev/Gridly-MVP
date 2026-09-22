"use server"

import { revalidatePath } from "next/cache"

import { requireBuyer } from "@/lib/auth"
import { cancelOrder, createOrder } from "@/lib/data/orders"
import { PlaceOrderSchema } from "@/lib/schemas/orders"

export type OrderActionResult = { ok: true; orderId?: string } | { ok: false; message: string }

function revalidate(contractId?: string) {
  revalidatePath("/buyer/orders")
  revalidatePath("/buyer/contracts")
  revalidatePath("/buyer/dashboard")
  revalidatePath("/vendor/orders")
  revalidatePath("/vendor/contracts")
  if (contractId) {
    revalidatePath(`/buyer/contracts/${contractId}`)
    revalidatePath(`/vendor/contracts/${contractId}`)
  }
}

export async function placeOrder(values: unknown): Promise<OrderActionResult> {
  const parsed = PlaceOrderSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid order." }
  const { profile } = await requireBuyer()
  const res = await createOrder(profile.id, { ...parsed.data, notes: parsed.data.notes || null })
  if (res.ok) revalidate(parsed.data.contractId)
  return res
}

export async function cancelBuyerOrder(orderId: string, contractId: string, reason?: string): Promise<OrderActionResult> {
  const { profile } = await requireBuyer()
  const res = await cancelOrder({ role: "buyer", id: profile.id }, orderId, reason)
  if (res.ok) revalidate(contractId)
  return res
}
