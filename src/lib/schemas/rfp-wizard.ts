import { z } from "zod"

import { todayInBusinessTz } from "@/lib/rfp/dates"

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

const optionalNumber = z.number({ error: "Enter a number" }).finite().nonnegative("Can't be negative").max(1_000_000_000, "That number looks too large").nullable().optional()

export const AttachmentSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  size: z.number().nonnegative(),
})
export type Attachment = z.infer<typeof AttachmentSchema>

export const DeliverySiteSchema = z.object({
  address: requiredString("Address").max(300, "Address is too long"),
  gallons: optionalNumber,
  tankSizeGallons: optionalNumber,
  deliveryWindow: z.string().trim().max(200, "Keep the delivery window under 200 characters").optional().or(z.literal("")),
})
export type DeliverySite = z.infer<typeof DeliverySiteSchema>

export const RfpWizardSchema = z
  .object({
    title: requiredString("Title").max(200, "Keep the title under 200 characters"),
    description: requiredString("Description").max(10000, "Keep the description under 10,000 characters"),
    fuelType: z.enum(RFP_FUEL_TYPES, { error: "Select a fuel type" }),
    quantityGallons: z.number({ error: "Enter a quantity in gallons" }).positive("Quantity must be greater than zero").max(1_000_000_000, "That quantity looks too large"),
    recurrence: z.enum(RFP_RECURRENCE, { error: "Select recurrence" }),
    urgency: z.enum(RFP_URGENCY, { error: "Select urgency" }),
    pricingMode: z.enum(PRICING_MODES),
    indexName: z.string().trim().optional().or(z.literal("")),

    deliveryStates: z.array(z.enum(US_STATES)).min(1, "Select at least one state"),
    deliveryAddresses: z.array(DeliverySiteSchema).min(1, "Add at least one delivery site"),
    deliveryDates: z.array(z.string().min(1, "Pick a delivery date")).min(1, "Add at least one delivery date").max(60, "Too many delivery dates"),

    requiredCapabilities: z.array(z.enum(DELIVERY_CAPABILITIES)),
    requiredCertifications: z.array(z.enum(SPECIAL_CERTIFICATIONS)),
    insuranceRequirements: z.string().trim().max(4000, "Keep insurance requirements under 4,000 characters").optional(),
    attachments: z.array(AttachmentSchema),

    supplierInviteMode: z.enum(SUPPLIER_INVITE_MODE),
    selectedVendorIds: z.array(z.string().max(64)).max(500),

    bidDueDate: requiredString("Bid due date"),
    decisionDate: requiredString("Decision date"),
    expectedAwardDate: requiredString("Expected award date"),
  })
  .superRefine((v, ctx) => {
    // Dates are YYYY-MM-DD strings, so plain string comparison orders them.
    if (v.bidDueDate && v.bidDueDate < todayInBusinessTz()) {
      ctx.addIssue({ code: "custom", path: ["bidDueDate"], message: "Bid due date can't be in the past" })
    }
    v.deliveryDates.forEach((d, i) => {
      if (d && d < todayInBusinessTz()) ctx.addIssue({ code: "custom", path: ["deliveryDates", i], message: "Delivery date can't be in the past" })
    })
    if (v.bidDueDate && v.decisionDate && v.decisionDate < v.bidDueDate) {
      ctx.addIssue({ code: "custom", path: ["decisionDate"], message: "Decision date must be on or after the bid due date" })
    }
    if (v.decisionDate && v.expectedAwardDate && v.expectedAwardDate < v.decisionDate) {
      ctx.addIssue({ code: "custom", path: ["expectedAwardDate"], message: "Expected award date must be on or after the decision date" })
    }
    if (v.pricingMode === "index" && !v.indexName?.trim()) {
      ctx.addIssue({ code: "custom", path: ["indexName"], message: "Name the index suppliers should price against (e.g. OPIS Chicago ULSD)" })
    }
  })

export type RfpWizardInput = z.infer<typeof RfpWizardSchema>

export const RfpBidSchema = z
  .object({
    pricingMode: z.enum(PRICING_MODES),
    pricePerGallon: z.number({ error: "Enter price per gallon" }).nonnegative("Price can't be negative").max(100, "That price per gallon looks wrong — check the decimal").optional(),
    indexName: z.string().trim().optional().or(z.literal("")),
    differential: z.number({ error: "Enter your differential" }).finite().min(-20, "Differential looks wrong").max(20, "Differential looks wrong").optional(),
    /** Vendor's current index quote, used to estimate the total on index bids */
    referenceIndexPrice: z.number({ error: "Enter the index price" }).positive("Enter the index price").max(100, "That index price looks wrong — check the decimal").optional(),
    /** Display only: the server recomputes the total as price × RFP gallons. */
    totalPrice: z.number().nonnegative().optional(),
    deliveryTerms: requiredString("Delivery terms"),
    validityDays: z.number({ error: "Enter how many days the bid is valid" }).int("Use a whole number of days").positive("Validity must be at least 1 day").max(365, "Validity can't exceed 365 days"),
    notes: z.string().trim().max(4000, "Notes are limited to 4,000 characters").optional(),
    attachmentName: z.string().trim().max(200).optional(),
    attachmentPath: z.string().trim().max(500).optional(),
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
