import { z } from "zod"

import {
  DELIVERY_CAPABILITIES,
  SPECIAL_CERTIFICATIONS,
  US_STATES,
} from "@/lib/schemas/vendor-application"

export const RFP_FUEL_TYPES = [
  "Diesel",
  "Gas",
  "Premium Gas",
  "Dyed Diesel",
  "DEF",
  "Jet Fuel",
  "Heating Oil",
  "Propane",
  "Marine Fuel",
  "Renewable Diesel",
] as const

export const RFP_RECURRENCE = ["one_time", "recurring"] as const
export const RFP_URGENCY = ["standard", "rush", "emergency"] as const
export const SUPPLIER_INVITE_MODE = ["auto", "manual"] as const
export const PRICING_MODES = ["fixed", "index"] as const
export type PricingMode = (typeof PRICING_MODES)[number]

export const PRICING_MODE_LABEL: Record<PricingMode, string> = {
  fixed: "Fixed price per gallon",
  index: "Index + differential",
}

const requiredString = (label: string) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`)

const optionalNumber = z.number().finite().nullable().optional()

export const AttachmentSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  size: z.number().nonnegative(),
})
export type Attachment = z.infer<typeof AttachmentSchema>

export const DeliverySiteSchema = z.object({
  address: requiredString("Address"),
  gallons: optionalNumber,
  tankSizeGallons: optionalNumber,
  deliveryWindow: z.string().trim().optional().or(z.literal("")),
})
export type DeliverySite = z.infer<typeof DeliverySiteSchema>

export const RfpWizardSchema = z
  .object({
    title: requiredString("Title"),
    description: requiredString("Description"),
    fuelType: z.enum(RFP_FUEL_TYPES, { error: "Select a fuel type" }),
    quantityGallons: z.number().positive("Quantity must be greater than zero"),
    recurrence: z.enum(RFP_RECURRENCE, { error: "Select recurrence" }),
    urgency: z.enum(RFP_URGENCY, { error: "Select urgency" }),
    pricingMode: z.enum(PRICING_MODES),
    indexName: z.string().trim().optional().or(z.literal("")),

    deliveryStates: z.array(z.enum(US_STATES)).min(1, "Select at least one state"),
    deliveryAddresses: z.array(DeliverySiteSchema).min(1, "Add at least one delivery site"),
    deliveryDates: z.array(z.string().min(1)).min(1, "Add at least one delivery date"),

    requiredCapabilities: z.array(z.enum(DELIVERY_CAPABILITIES)),
    requiredCertifications: z.array(z.enum(SPECIAL_CERTIFICATIONS)),
    insuranceRequirements: z.string().trim().optional(),
    attachments: z.array(AttachmentSchema),

    supplierInviteMode: z.enum(SUPPLIER_INVITE_MODE),
    selectedVendorIds: z.array(z.string()),

    bidDueDate: requiredString("Bid due date"),
    decisionDate: requiredString("Decision date"),
    expectedAwardDate: requiredString("Expected award date"),
  })
  .superRefine((v, ctx) => {
    if (v.pricingMode === "index" && !v.indexName?.trim()) {
      ctx.addIssue({ code: "custom", path: ["indexName"], message: "Name the index suppliers should price against (e.g. OPIS Chicago ULSD)" })
    }
  })

export type RfpWizardInput = z.infer<typeof RfpWizardSchema>

export const RfpBidSchema = z
  .object({
    pricingMode: z.enum(PRICING_MODES),
    pricePerGallon: z.number().nonnegative().optional(),
    indexName: z.string().trim().optional().or(z.literal("")),
    differential: z.number().finite().optional(),
    /** Vendor's current index quote, used to estimate the total on index bids */
    referenceIndexPrice: z.number().positive().optional(),
    totalPrice: z.number().positive("Enter total price"),
    deliveryTerms: requiredString("Delivery terms"),
    validityDays: z.number().int().positive("Validity must be at least 1 day"),
    notes: z.string().trim().optional(),
    attachmentName: z.string().trim().optional(),
    attachmentPath: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.pricingMode === "fixed") {
      if (!v.pricePerGallon || v.pricePerGallon <= 0) ctx.addIssue({ code: "custom", path: ["pricePerGallon"], message: "Enter price per gallon" })
    } else {
      if (v.differential == null || Number.isNaN(v.differential)) ctx.addIssue({ code: "custom", path: ["differential"], message: "Enter your differential (can be negative)" })
      if (!v.indexName?.trim()) ctx.addIssue({ code: "custom", path: ["indexName"], message: "Name the index" })
      if (!v.referenceIndexPrice) ctx.addIssue({ code: "custom", path: ["referenceIndexPrice"], message: "Enter today's index price to estimate the total" })
    }
  })

export type RfpBidInput = z.infer<typeof RfpBidSchema>
