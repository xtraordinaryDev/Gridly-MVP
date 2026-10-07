import {
  ADDITIONAL_SERVICES,
  DELIVERY_CAPABILITIES,
  EMERGENCY_RETAINER_OPTIONS,
  ENTITY_TYPES,
  OPERATING_HOURS,
  ORGANIZATION_TYPES,
  PRICING_BASIS,
  PRODUCTS_OFFERED,
  SPECIAL_CERTIFICATIONS,
  US_STATES,
  type VendorRegistration,
} from "@/lib/schemas/vendor-application"

const TEXT_FIELDS = [
  "companyName", "corporateAddress", "stateOfIncorporation", "usDotNumber", "websiteUrl",
  "salesRepFirstName", "salesRepLastName", "salesRepEmail", "salesRepPhone",
  "dispatchContactName", "dispatchPhone", "dispatchEmail",
  "emergencyDispatchName", "emergencyDispatchPhone", "emergencyDispatchEmail",
  "billingAddress", "billingContactName", "billingEmail", "billingPhone", "deliveryContactInfo", "billingSystem",
  "terminalsAvailable", "pricingBasisOther", "areasOwnedTrucks", "areasSubcontracted", "standardOrderLeadTime",
  "brandsOffered", "emergencyOrderLeadTime", "emergencyResponseTimes",
  "otherServices", "wetHoseTicketType", "telematicsSystem", "dispatchSoftware",
] as const

const NUMBER_FIELDS = ["yearFounded", "tankwagonsCount", "transportsCount", "annualGallonsDistributed"] as const

const CHOICE_FIELDS = {
  entityType: ENTITY_TYPES,
  specialCertification: SPECIAL_CERTIFICATIONS,
  pricingBasis: PRICING_BASIS,
  emergencyRetainerWilling: EMERGENCY_RETAINER_OPTIONS,
} as const

const LIST_FIELDS = {
  organizationType: ORGANIZATION_TYPES,
  operatingHours: OPERATING_HOURS,
  productsOffered: PRODUCTS_OFFERED,
  deliveryCapabilities: DELIVERY_CAPABILITIES,
  additionalServices: ADDITIONAL_SERVICES,
  licensedStates: US_STATES,
} as const

const DOCUMENT_FIELDS = ["w9Form", "certificateOfInsurance", "distributorLicense", "companyLogo"] as const

// The short interest form uses broader product names than the full profile.
const PRODUCT_ALIASES: Record<string, string> = { Renewable: "Renewable Fuel" }

/**
 * Makes saved values safe to load into the form. Prefill comes from three
 * places that don't all share the form's shapes — the interest form, a
 * previously submitted application, and a localStorage draft that may predate
 * a field changing type — and a value the form can't render (an unknown
 * product, an array where one choice is expected) blocks the step with an
 * error nobody can see. Anything unrecognised is dropped.
 */
export function normalizeRegistration(input: unknown): Partial<VendorRegistration> {
  if (!input || typeof input !== "object") return {}
  const src = input as Record<string, unknown>
  const out: Record<string, unknown> = {}

  for (const key of TEXT_FIELDS) if (typeof src[key] === "string") out[key] = src[key]

  for (const key of NUMBER_FIELDS) {
    const n = typeof src[key] === "string" && src[key] !== "" ? Number(src[key]) : src[key]
    if (typeof n === "number" && Number.isFinite(n)) out[key] = n
  }

  if (typeof src.nationwide === "boolean") out.nationwide = src.nationwide

  for (const [key, options] of Object.entries(CHOICE_FIELDS)) {
    const candidates = Array.isArray(src[key]) ? (src[key] as unknown[]) : [src[key]]
    const hit = candidates.find((c) => typeof c === "string" && (options as readonly string[]).includes(c))
    if (hit) out[key] = hit
  }

  for (const [key, options] of Object.entries(LIST_FIELDS)) {
    if (!Array.isArray(src[key])) continue
    const mapped = (src[key] as unknown[]).map((v) => (key === "productsOffered" && typeof v === "string" ? PRODUCT_ALIASES[v] ?? v : v))
    out[key] = [...new Set(mapped.filter((v): v is string => typeof v === "string" && (options as readonly string[]).includes(v)))]
  }

  for (const key of DOCUMENT_FIELDS) {
    const d = src[key] as { path?: unknown; name?: unknown; size?: unknown } | null | undefined
    if (d && typeof d.path === "string" && d.path && typeof d.name === "string" && d.name) {
      out[key] = { path: d.path, name: d.name, size: typeof d.size === "number" && d.size >= 0 ? d.size : 0 }
    }
  }

  return out as Partial<VendorRegistration>
}
