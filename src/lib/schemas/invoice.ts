import { z } from "zod"

export const LINE_KINDS = ["fuel", "fee", "tax", "credit"] as const
export const PAYMENT_METHODS = ["ach", "check", "wire", "card", "other"] as const

const optionalText = z.string().trim().optional().or(z.literal(""))
const optionalNumber = z.number().finite().nullable().optional()

export const InvoiceLineSchema = z
  .object({
    kind: z.enum(LINE_KINDS),
    description: z.string().trim().min(1, "Description is required"),
    deliveryDate: optionalText,
    ticketNumber: optionalText,
    gallons: optionalNumber,
    pricePerGallon: optionalNumber,
    /** Index contracts: the index price on the delivery date; $/gal = index + differential */
    indexPrice: optionalNumber,
    /** Set when the line was pulled from a logged delivery */
    deliveryId: optionalText,
    amount: z.number({ error: "Amount is required" }).finite(),
  })
  .superRefine((line, ctx) => {
    if (line.kind === "fuel") {
      if (!line.gallons || line.gallons <= 0) {
        ctx.addIssue({ code: "custom", path: ["gallons"], message: "Enter gallons delivered" })
      }
      if (!line.pricePerGallon || line.pricePerGallon <= 0) {
        ctx.addIssue({ code: "custom", path: ["pricePerGallon"], message: "Enter price per gallon" })
      }
    } else if (line.kind === "credit") {
      if (line.amount >= 0) {
        ctx.addIssue({ code: "custom", path: ["amount"], message: "Credits must be negative" })
      }
    } else if (line.amount <= 0) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Amount must be greater than zero" })
    }
  })

export const InvoiceSchema = z
  .object({
    contractId: z.string().min(1, "Select a contract"),
    issueDate: z.string().min(1, "Issue date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    notes: optionalText,
    lineItems: z.array(InvoiceLineSchema).min(1, "Add at least one line item"),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    path: ["dueDate"],
    message: "Due date must be on or after the issue date",
  })

export type InvoiceFormValues = z.infer<typeof InvoiceSchema>
export type InvoiceLineValues = z.infer<typeof InvoiceLineSchema>

export const PaymentSchema = z.object({
  amount: z.number({ error: "Enter an amount" }).positive("Amount must be greater than zero"),
  method: z.enum(PAYMENT_METHODS),
  reference: optionalText,
  paidAt: z.string().min(1, "Payment date is required"),
  note: optionalText,
})

export type PaymentFormValues = z.infer<typeof PaymentSchema>

export const DisputeSchema = z.object({
  reason: z.string().trim().min(5, "Tell the supplier what needs to change"),
})

export interface TotalsLine {
  kind: (typeof LINE_KINDS)[number]
  gallons?: number | null
  pricePerGallon?: number | null
  amount: number
}

/** Totals from line items; fuel lines are gallons × price. */
export function computeTotals(lines: TotalsLine[]) {
  let subtotal = 0
  let fees = 0
  let tax = 0
  for (const l of lines) {
    const amt =
      l.kind === "fuel" && l.gallons && l.pricePerGallon
        ? Math.round(l.gallons * l.pricePerGallon * 100) / 100
        : l.amount
    if (l.kind === "fuel" || l.kind === "credit") subtotal += amt
    else if (l.kind === "fee") fees += amt
    else tax += amt
  }
  const r = (n: number) => Math.round(n * 100) / 100
  return { subtotal: r(subtotal), fees: r(fees), tax: r(tax), total: r(subtotal + fees + tax) }
}
