"use server"

import { revalidatePath } from "next/cache"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import {
  createInvoice,
  recordPayment,
  resolveDispute,
  sendInvoice,
  updateInvoice,
  voidInvoice,
} from "@/lib/data/invoices"
import { InvoiceSchema, PaymentSchema } from "@/lib/schemas/invoice"

export type InvoiceActionResult =
  | { ok: true; invoiceId?: string }
  | { ok: false; message: string }

function revalidate(id?: string) {
  revalidatePath("/vendor/invoices")
  revalidatePath("/vendor/contracts")
  revalidatePath("/vendor/dashboard")
  revalidatePath("/buyer/invoices")
  revalidatePath("/buyer/dashboard")
  if (id) {
    revalidatePath(`/vendor/invoices/${id}`)
    revalidatePath(`/buyer/invoices/${id}`)
  }
}

async function vendorContext() {
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  return { profile, vendorId }
}

function toInput(values: unknown) {
  const parsed = InvoiceSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Invalid invoice." }
  }
  const d = parsed.data
  return {
    ok: true as const,
    input: {
      contractId: d.contractId,
      issueDate: d.issueDate,
      dueDate: d.dueDate,
      notes: d.notes || undefined,
      lineItems: d.lineItems.map((l) => ({
        kind: l.kind,
        description: l.description,
        deliveryDate: l.deliveryDate || null,
        ticketNumber: l.ticketNumber || null,
        gallons: l.gallons ?? null,
        pricePerGallon: l.pricePerGallon ?? null,
        indexPrice: l.indexPrice ?? null,
        deliveryId: l.deliveryId || null,
        amount: l.amount,
      })),
    },
  }
}

export async function saveInvoiceDraft(values: unknown): Promise<InvoiceActionResult> {
  const parsed = toInput(values)
  if (!parsed.ok) return parsed
  const { profile, vendorId } = await vendorContext()
  const res = await createInvoice(vendorId, profile.id, parsed.input)
  if (res.ok) revalidate(res.invoiceId)
  return res
}

export async function createAndSendInvoice(values: unknown): Promise<InvoiceActionResult> {
  const parsed = toInput(values)
  if (!parsed.ok) return parsed
  const { profile, vendorId } = await vendorContext()
  const created = await createInvoice(vendorId, profile.id, parsed.input)
  if (!created.ok) return created
  const sent = await sendInvoice(created.invoiceId, vendorId, profile.id)
  revalidate(created.invoiceId)
  if (!sent.ok) return { ok: false, message: `Saved as draft, but sending failed: ${sent.message}` }
  return { ok: true, invoiceId: created.invoiceId }
}

export async function saveInvoiceEdits(invoiceId: string, values: unknown): Promise<InvoiceActionResult> {
  const parsed = toInput(values)
  if (!parsed.ok) return parsed
  const { vendorId } = await vendorContext()
  const res = await updateInvoice(invoiceId, vendorId, parsed.input)
  if (res.ok) revalidate(invoiceId)
  return res.ok ? { ok: true, invoiceId } : res
}

export async function sendInvoiceAction(invoiceId: string): Promise<InvoiceActionResult> {
  const { profile, vendorId } = await vendorContext()
  const res = await sendInvoice(invoiceId, vendorId, profile.id)
  if (res.ok) revalidate(invoiceId)
  return res
}

export async function voidInvoiceAction(invoiceId: string, reason: string): Promise<InvoiceActionResult> {
  const { profile, vendorId } = await vendorContext()
  const res = await voidInvoice(invoiceId, vendorId, profile.id, reason)
  if (res.ok) revalidate(invoiceId)
  return res
}

export async function resolveDisputeAction(invoiceId: string, note: string): Promise<InvoiceActionResult> {
  const { profile, vendorId } = await vendorContext()
  const res = await resolveDispute(invoiceId, vendorId, profile.id, note)
  if (res.ok) revalidate(invoiceId)
  return res
}

export async function recordVendorPayment(invoiceId: string, values: unknown): Promise<InvoiceActionResult> {
  const parsed = PaymentSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid payment." }
  const { profile, vendorId } = await vendorContext()
  const res = await recordPayment(invoiceId, { role: "vendor", id: vendorId, profileId: profile.id }, {
    amount: parsed.data.amount,
    method: parsed.data.method,
    reference: parsed.data.reference || undefined,
    paidAt: parsed.data.paidAt,
    note: parsed.data.note || undefined,
  })
  if (res.ok) revalidate(invoiceId)
  return res
}
