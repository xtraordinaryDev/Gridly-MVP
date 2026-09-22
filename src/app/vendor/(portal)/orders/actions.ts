"use server"

import { revalidatePath } from "next/cache"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { cancelOrder, confirmOrder, logDelivery } from "@/lib/data/orders"
import { ConfirmOrderSchema, LogDeliverySchema } from "@/lib/schemas/orders"

export type VendorOrderResult = { ok: true; deliveryId?: string } | { ok: false; message: string }

function revalidate(contractId?: string) {
  revalidatePath("/vendor/orders")
  revalidatePath("/vendor/contracts")
  revalidatePath("/vendor/dashboard")
  revalidatePath("/vendor/invoices/new")
  revalidatePath("/buyer/orders")
  revalidatePath("/buyer/contracts")
  if (contractId) {
    revalidatePath(`/vendor/contracts/${contractId}`)
    revalidatePath(`/buyer/contracts/${contractId}`)
  }
}

async function ctx() {
  const { profile, preview } = await requireVendor()
  return { profile, vendorId: await resolveVendorIdForSession(profile.id, preview) }
}

export async function confirmVendorOrder(orderId: string, contractId: string, values: unknown): Promise<VendorOrderResult> {
  const parsed = ConfirmOrderSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  const { vendorId } = await ctx()
  const res = await confirmOrder(vendorId, orderId, parsed.data.scheduledFor, parsed.data.note || undefined)
  if (res.ok) revalidate(contractId)
  return res
}

export async function cancelVendorOrder(orderId: string, contractId: string, reason?: string): Promise<VendorOrderResult> {
  const { vendorId } = await ctx()
  const res = await cancelOrder({ role: "vendor", id: vendorId }, orderId, reason)
  if (res.ok) revalidate(contractId)
  return res
}

export async function logVendorDelivery(values: unknown): Promise<VendorOrderResult> {
  const parsed = LogDeliverySchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid delivery." }
  const { vendorId } = await ctx()
  const d = parsed.data
  const res = await logDelivery(vendorId, {
    contractId: d.contractId,
    orderId: d.orderId || null,
    deliveredAt: d.deliveredAt,
    siteAddress: d.siteAddress,
    gallons: d.gallons,
    ticketNumber: d.ticketNumber || null,
    bolPath: d.bolPath || null,
    notes: d.notes || null,
  })
  if (res.ok) revalidate(d.contractId)
  return res
}
