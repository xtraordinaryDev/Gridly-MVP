import { z } from "zod"

export const BUYER_INDUSTRIES = [
  "Food & Agriculture",
  "Logistics & Transportation",
  "Manufacturing",
  "Aviation / Airport",
  "Healthcare / Hospital",
  "Utilities",
  "Government / Public Sector",
  "Construction",
  "Other",
] as const

export const BUYER_VOLUME_RANGES = [
  "< 100K gal/yr",
  "100K – 1M gal/yr",
  "1M – 5M gal/yr",
  "5M – 25M gal/yr",
  "25M+ gal/yr",
] as const

/** Field limits, shared with the inputs' maxLength so the browser stops typing at the same point. */
export const BUYER_REQUEST_LIMITS = {
  fullName: 120,
  companyName: 200,
  email: 254,
  phone: 30,
  useCase: 2000,
} as const

export const BuyerAccessRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Your name is required")
    .max(BUYER_REQUEST_LIMITS.fullName, "Keep your name under 120 characters"),
  companyName: z
    .string()
    .trim()
    .min(1, "Company / organization is required")
    .max(BUYER_REQUEST_LIMITS.companyName, "Keep the organization name under 200 characters"),
  email: z.email("Enter a valid work email").max(BUYER_REQUEST_LIMITS.email, "That email address is too long"),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(BUYER_REQUEST_LIMITS.phone, "Enter a phone number of 30 characters or fewer"),
  industry: z.enum(BUYER_INDUSTRIES, { message: "Select your industry" }),
  estimatedVolume: z.enum(BUYER_VOLUME_RANGES).optional(),
  useCase: z
    .string()
    .trim()
    .min(10, "Tell us a little about your fuel procurement needs")
    .max(BUYER_REQUEST_LIMITS.useCase, "Please keep this under 2,000 characters"),
})

export type BuyerAccessRequest = z.infer<typeof BuyerAccessRequestSchema>
