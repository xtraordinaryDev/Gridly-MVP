import { z } from "zod"

const text = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional()

// Numbers arrive as text inputs. Blank is "not provided"; anything else must
// be a whole, non-negative number (thousands separators allowed).
const wholeNumber = (label: string, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .superRefine((v, ctx) => {
      if (!v) return
      const raw = v.replace(/,/g, "")
      if (!/^\d+$/.test(raw)) {
        ctx.addIssue({ code: "custom", message: `${label} must be a whole number, 0 or more` })
      } else if (Number(raw) > max) {
        ctx.addIssue({ code: "custom", message: `${label} can't be more than ${max.toLocaleString("en-US")}` })
      }
    })

/** Only http(s) links are safe to render as an href. */
export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".")
  } catch {
    return false
  }
}

export const ProfileSchema = z.object({
  website: z
    .string()
    .trim()
    .max(200, "Website must be 200 characters or fewer")
    .refine((v) => v === "" || isHttpUrl(v), "Enter a full web address starting with http:// or https://")
    .optional(),
  corporateAddress: text(300, "Address"),
  usDotNumber: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{1,8}$/.test(v), "US DOT number is up to 8 digits")
    .optional(),
  yearFounded: z
    .string()
    .trim()
    .optional()
    .superRefine((v, ctx) => {
      if (!v) return
      const year = new Date().getFullYear()
      if (!/^\d{4}$/.test(v) || Number(v) < 1800 || Number(v) > year) {
        ctx.addIssue({ code: "custom", message: `Enter a four-digit year between 1800 and ${year}` })
      }
    }),
  description: text(2000, "Description"),
  specialCertification: text(100, "Certification"),
  productsOffered: z.array(z.string().max(100)).max(50),
  brandsOffered: text(300, "Brands"),
  deliveryCapabilities: z.array(z.string().max(200)).max(50),
  additionalServices: z.array(z.string().max(200)).max(50),
  licensedStates: z.array(z.string().max(60)).max(60),
  tankwagonsCount: wholeNumber("Tankwagons", 100_000),
  transportsCount: wholeNumber("Transports", 100_000),
  annualGallonsDistributed: wholeNumber("Annual gallons", 100_000_000_000),
  standardOrderLeadTime: text(100, "Lead time"),
})

export type ProfileValues = z.infer<typeof ProfileSchema>

export const CHANGE_REQUEST_FIELDS = ["Legal entity name", "Entity type", "State of incorporation"] as const

export const ChangeRequestSchema = z.object({
  field: z.enum(CHANGE_REQUEST_FIELDS, { error: "That field can't be changed by request." }),
  message: z
    .string()
    .trim()
    .min(5, "Describe the change you need (at least 5 characters).")
    .max(2000, "Keep the request under 2,000 characters."),
})
