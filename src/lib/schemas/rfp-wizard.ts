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
] as const

export const RFP_RECURRENCE = ["one_time", "recurring"] as const
export const RFP_URGENCY = ["standard", "rush", "emergency"] as const
export const SUPPLIER_INVITE_MODE = ["auto", "manual"] as const

const requiredString = (label: string) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`)

export const RfpWizardSchema = z.object({
  title: requiredString("Title"),
  description: requiredString("Description"),
  fuelType: z.enum(RFP_FUEL_TYPES, { error: "Select a fuel type" }),
  quantityGallons: z.number().positive("Quantity must be greater than zero"),
  recurrence: z.enum(RFP_RECURRENCE, { error: "Select recurrence" }),
  urgency: z.enum(RFP_URGENCY, { error: "Select urgency" }),

  deliveryStates: z.array(z.enum(US_STATES)).min(1, "Select at least one state"),
  deliveryAddresses: z
    .array(z.object({ address: requiredString("Address") }))
    .min(1, "Add at least one delivery address"),
  deliveryDates: z.array(z.string().min(1)).min(1, "Add at least one delivery date"),

  requiredCapabilities: z.array(z.enum(DELIVERY_CAPABILITIES)),
  requiredCertifications: z.array(z.enum(SPECIAL_CERTIFICATIONS)),
  insuranceRequirements: z.string().trim().optional(),

  supplierInviteMode: z.enum(SUPPLIER_INVITE_MODE),
  selectedVendorIds: z.array(z.string()),

  bidDueDate: requiredString("Bid due date"),
  decisionDate: requiredString("Decision date"),
  expectedAwardDate: requiredString("Expected award date"),
})

export type RfpWizardInput = z.infer<typeof RfpWizardSchema>

export const RfpBidSchema = z.object({
  pricePerGallon: z.number().positive("Enter price per gallon"),
  totalPrice: z.number().positive("Enter total price"),
  deliveryTerms: requiredString("Delivery terms"),
  validityDays: z.number().int().positive("Validity must be at least 1 day"),
  notes: z.string().trim().optional(),
  attachmentName: z.string().trim().optional(),
})

export type RfpBidInput = z.infer<typeof RfpBidSchema>
