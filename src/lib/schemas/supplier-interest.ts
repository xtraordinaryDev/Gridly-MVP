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

/** Field limits, shared with the inputs' maxLength so the browser stops typing at the same point. */
export const SUPPLIER_INTEREST_LIMITS = {
  companyName: 200,
  contactName: 120,
  email: 254,
  phone: 30,
  website: 300,
  description: 2000,
} as const

export const SupplierInterestSchema = z.object({
  companyName: z
    .string({ error: "Company name is required" })
    .trim()
    .min(1, "Company name is required")
    .max(SUPPLIER_INTEREST_LIMITS.companyName, "Keep the company name under 200 characters"),
  contactName: z
    .string({ error: "Contact name is required" })
    .trim()
    .min(1, "Contact name is required")
    .max(SUPPLIER_INTEREST_LIMITS.contactName, "Keep the contact name under 120 characters"),
  email: z
    .email("Enter a valid email address")
    .max(SUPPLIER_INTEREST_LIMITS.email, "That email address is too long"),
  phone: z
    .string({ error: "Phone is required" })
    .trim()
    .min(7, "Enter a valid phone number")
    .max(SUPPLIER_INTEREST_LIMITS.phone, "Enter a phone number of 30 characters or fewer"),
  website: z
    .url("Enter a valid URL")
    .max(SUPPLIER_INTEREST_LIMITS.website, "Keep the website URL under 300 characters")
    .optional()
    .or(z.literal("")),
  statesServed: z
    .array(z.enum(US_STATES))
    .min(1, "Select at least one state")
    .max(US_STATES.length, "Each state can only be selected once"),
  productsOffered: z
    .array(z.enum(INTEREST_PRODUCTS))
    .min(1, "Select at least one product")
    .max(INTEREST_PRODUCTS.length, "Each product can only be selected once"),
  annualGallons: z.enum(ANNUAL_GALLONS_RANGES, {
    error: "Select an annual volume range",
  }),
  description: z
    .string({ error: "A brief description is required" })
    .trim()
    .min(10, "Tell us a little more (at least 10 characters)")
    .max(SUPPLIER_INTEREST_LIMITS.description, "Please keep it under 2,000 characters"),
})

export type SupplierInterest = z.infer<typeof SupplierInterestSchema>
