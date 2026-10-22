import { z } from "zod"

/**
 * Short "Become a Supplier" interest form. NOT the full vendor application —
 * this captures enough to create a `vendor_applications` row with
 * status='pending_review', source='self_applied'. Products, volume and a
 * contact; states, documents and the company profile are collected in the
 * full onboarding form, sent later via a token-gated email link.
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
  productsOffered: z
    .array(z.enum(INTEREST_PRODUCTS))
    .min(1, "Select at least one product")
    .max(INTEREST_PRODUCTS.length, "Each product can only be selected once"),
  annualGallons: z.enum(ANNUAL_GALLONS_RANGES, {
    error: "Select an annual volume range",
  }),
})

export type SupplierInterest = z.infer<typeof SupplierInterestSchema>
