"use server"

import { revalidatePath } from "next/cache"

import { requireBuyer } from "@/lib/auth"
import { disputeInvoice, recordPayment } from "@/lib/data/invoices"
import { DisputeSchema, PaymentSchema } from "@/lib/schemas/invoice"

export type BuyerInvoiceActionResult = { ok: true } | { ok: false; message: string }

function revalidate(id: string) {
  revalidatePath("/buyer/invoices")
  revalidatePath("/buyer/dashboard")
  revalidatePath(`/buyer/invoices/${id}`)
  revalidatePath("/vendor/invoices")
  revalidatePath(`/vendor/invoices/${id}`)
  revalidatePath("/vendor/dashboard")
}

export async function disputeInvoiceAction(invoiceId: string, values: unknown): Promise<BuyerInvoiceActionResult> {
  const parsed = DisputeSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  const { profile } = await requireBuyer()
  const res = await disputeInvoice(invoiceId, profile.id, parsed.data.reason)
  if (res.ok) revalidate(invoiceId)
  return res
}

export async function recordBuyerPayment(invoiceId: string, values: unknown): Promise<BuyerInvoiceActionResult> {
  const parsed = PaymentSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid payment." }
  const { profile } = await requireBuyer()
  const res = await recordPayment(invoiceId, { role: "buyer", id: profile.id, profileId: profile.id }, {
    amount: parsed.data.amount,
    method: parsed.data.method,
    reference: parsed.data.reference || undefined,
    paidAt: parsed.data.paidAt,
    note: parsed.data.note || undefined,
  })
  if (res.ok) revalidate(invoiceId)
  return res
}
