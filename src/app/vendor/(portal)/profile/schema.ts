import { z } from "zod"

export const ProfileSchema = z.object({
  website: z.url("Enter a valid URL").or(z.literal("")).optional(),
  corporateAddress: z.string().optional(),
  usDotNumber: z.string().optional(),
  yearFounded: z.string().optional(),
  description: z.string().optional(),
  specialCertification: z.string().optional(),
  productsOffered: z.array(z.string()),
  brandsOffered: z.string().optional(),
  deliveryCapabilities: z.array(z.string()),
  additionalServices: z.array(z.string()),
  licensedStates: z.array(z.string()),
  tankwagonsCount: z.string().optional(),
  transportsCount: z.string().optional(),
  annualGallonsDistributed: z.string().optional(),
  standardOrderLeadTime: z.string().optional(),
})

export type ProfileValues = z.infer<typeof ProfileSchema>
