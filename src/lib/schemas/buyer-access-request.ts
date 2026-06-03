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

export const BuyerAccessRequestSchema = z.object({
  fullName: z.string().trim().min(1, "Your name is required"),
  companyName: z.string().trim().min(1, "Company / organization is required"),
  email: z.email("Enter a valid work email"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  industry: z.enum(BUYER_INDUSTRIES, { message: "Select your industry" }),
  estimatedVolume: z.enum(BUYER_VOLUME_RANGES).optional(),
  useCase: z
    .string()
    .trim()
    .min(10, "Tell us a little about your fuel procurement needs"),
})

export type BuyerAccessRequest = z.infer<typeof BuyerAccessRequestSchema>
