import { z } from "zod"

import { US_STATES } from "@/lib/schemas/vendor-application"

/**
 * Short "Become a Supplier" interest form. NOT the full vendor application —
 * this captures enough to create a `vendor_applications` row with
 * status='pending_review', source='self_applied'. The full onboarding form is
 * sent later via a token-gated email link.
 */

export const INTEREST_PRODUCTS = [
  "Gas",
  "Diesel",
  "DEF",
  "Jet Fuel",
  "Propane",
  "Renewable",
  "Other",
] as const

export const ANNUAL_GALLONS_RANGES = [
  "<1M",
  "1-5M",
  "5-25M",
  "25-100M",
  "100M+",
] as const

export const SupplierInterestSchema = z.object({
  companyName: z
    .string({ error: "Company name is required" })
    .trim()
    .min(1, "Company name is required"),
  contactName: z
    .string({ error: "Contact name is required" })
    .trim()
    .min(1, "Contact name is required"),
  email: z.email("Enter a valid email address"),
  phone: z
    .string({ error: "Phone is required" })
    .trim()
    .min(7, "Enter a valid phone number"),
  website: z.url("Enter a valid URL").optional().or(z.literal("")),
  statesServed: z
    .array(z.enum(US_STATES))
    .min(1, "Select at least one state"),
  productsOffered: z
    .array(z.enum(INTEREST_PRODUCTS))
    .min(1, "Select at least one product"),
  annualGallons: z.enum(ANNUAL_GALLONS_RANGES, {
    error: "Select an annual volume range",
  }),
  description: z
    .string({ error: "A brief description is required" })
    .trim()
    .min(10, "Tell us a little more (at least 10 characters)")
    .max(2000, "Please keep it under 2000 characters"),
})

export type SupplierInterest = z.infer<typeof SupplierInterestSchema>
