import { z } from "zod"

/**
 * GridLink — Vendor Application schema
 *
 * Mirrors the FuelMe-style onboarding form. Vendors complete this BEFORE an
 * account exists (token-gated). On submit, file fields hold the uploaded
 * `File`; once persisted they are referenced by URL in `vendor_documents`.
 *
 * Use `VendorApplicationSchema` with `@hookform/resolvers/zod`.
 */

// ---------------------------------------------------------------------------
// Option sets (exported for building the form UI / select inputs)
// ---------------------------------------------------------------------------
export const ENTITY_TYPES = [
  "LLC",
  "Corporation",
  "Sole Proprietorship",
  "Partnership",
  "Other",
] as const

export const ORGANIZATION_TYPES = [
  "Broker",
  "Supplier",
  "Transportation/Company Trucks",
] as const

export const SPECIAL_CERTIFICATIONS = [
  "None",
  "DBE",
  "MBE",
  "WBE",
  "SBE",
  "Veteran-Owned",
  "HUBZone",
  "8(a)",
] as const

export const OPERATING_HOURS = [
  "Open weekends no charge",
  "Open weekends extra charge",
  "Open holidays no charge",
  "Open holidays extra charge",
  "Closed weekends",
  "Closed holidays",
] as const

export const PRICING_BASIS = ["OPIS GCA 10am", "Other"] as const

export const PRODUCTS_OFFERED = [
  "Gas",
  "Premium Gas",
  "Diesel",
  "Dyed Diesel",
  "Heating Oil",
  "Kerosene",
  "Bio-Diesel",
  "Winter Blends or Premium Diesel",
  "DEF",
  "Jet Fuel",
  "Marine Fuel",
  "Propane",
  "Renewable Fuel",
  "Synthetic Oil",
  "Motor Oil",
  "Hydraulics",
  "Antifreeze",
  "Lubes",
  "Water",
  "Ethanol",
  "Racing Fuel",
  "Winter Additive",
  "Biocide",
  "Deicer",
  "Windshield washer fluid",
] as const

export const EMERGENCY_RETAINER_OPTIONS = ["Yes", "No", "Possibly"] as const

export const DELIVERY_CAPABILITIES = [
  "Wet-hose/Mobile Refueling",
  "Wet-hose gasoline",
  "Wet-hose DEF",
  "Provide loner fuel tanks",
  "Provide Fuel Management Systems",
  "Install Tank Monitors",
  "Provide delivery tickets within 24 hours",
  "Provide Tank Repairs",
  "Provide Tank Inspections",
  "Provide Tank Testing",
  "Provide Tank Polishing",
  "Provide Pump Outs",
  "Dispose of Waste Oil",
] as const

export const ADDITIONAL_SERVICES = [
  "Utilize dispatch/scheduling software",
  "Able to accept orders via email notification",
  "Able to have staff & drivers utilize GridLink app",
  "Utilize telematics on vehicles",
  "Able to integrate through API or other forms of integration",
  "Able to provide CSV file with breakdown of fueled assets",
] as const

export const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------
const requiredString = (label: string) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`)

const optionalString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))

const optionalUrl = z
  .url("Enter a valid URL")
  .optional()
  .or(z.literal(""))

const requiredNumber = (label: string) =>
  z
    .number({ error: `${label} is required` })
    .nonnegative(`${label} must be a positive number`)

const optionalNumber = z.number().optional()

// Uploaded file. On the client this is a browser `File`; optional fields may
// be omitted. (Persisted documents are referenced by URL elsewhere.)
const requiredFile = (label: string) =>
  z.file({ error: `${label} is required` })

const optionalFile = z.file().optional()

// ---------------------------------------------------------------------------
// Product category grouping (for the registration form UI)
// ---------------------------------------------------------------------------
export const PRODUCT_CATEGORIES: Record<
  "Fuels" | "Additives & Fluids" | "Lubricants",
  readonly (typeof PRODUCTS_OFFERED)[number][]
> = {
  Fuels: [
    "Gas",
    "Premium Gas",
    "Diesel",
    "Dyed Diesel",
    "Heating Oil",
    "Kerosene",
    "Bio-Diesel",
    "Winter Blends or Premium Diesel",
    "DEF",
    "Jet Fuel",
    "Marine Fuel",
    "Propane",
    "Renewable Fuel",
    "Ethanol",
    "Racing Fuel",
  ],
  "Additives & Fluids": [
    "Antifreeze",
    "Water",
    "Winter Additive",
    "Biocide",
    "Deicer",
    "Windshield washer fluid",
  ],
  Lubricants: ["Synthetic Oil", "Motor Oil", "Hydraulics", "Lubes"],
}

/**
 * Reference to a file uploaded to Supabase Storage. The full vendor
 * registration form uploads documents up-front and stores these references
 * (rather than raw `File`s) so progress can persist across multi-step
 * navigation and localStorage drafts.
 */
export const DocumentRefSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  size: z.number().nonnegative(),
})

export type DocumentRef = z.infer<typeof DocumentRefSchema>

// ---------------------------------------------------------------------------
// Vendor Application Schema
// ---------------------------------------------------------------------------
export const VendorApplicationObjectSchema = z
  .object({
    // --- Company Information ---
    companyName: requiredString("Company name"),
    corporateAddress: requiredString("Corporate address"),
    stateOfIncorporation: requiredString("State of incorporation"),
    entityType: z.enum(ENTITY_TYPES, { error: "Select an entity type" }),
    organizationType: z
      .array(z.enum(ORGANIZATION_TYPES))
      .min(1, "Select at least one organization type"),
    specialCertification: z.enum(SPECIAL_CERTIFICATIONS).optional(),
    nationwide: z.boolean({ error: "Specify nationwide coverage" }),
    usDotNumber: optionalString,
    websiteUrl: optionalUrl,
    yearFounded: optionalNumber,

    // --- Documents (uploads — stored as file references after submit) ---
    w9Form: requiredFile("W-9 form"),
    certificateOfInsurance: requiredFile("Certificate of insurance"),
    distributorLicense: optionalFile,
    companyLogo: optionalFile,

    // --- Sales Rep Contact ---
    salesRepFirstName: requiredString("Sales rep first name"),
    salesRepLastName: requiredString("Sales rep last name"),
    salesRepEmail: z.email("Enter a valid sales rep email"),
    salesRepPhone: requiredString("Sales rep phone"),

    // --- Dispatch Contact ---
    dispatchContactName: requiredString("Dispatch contact name"),
    dispatchPhone: requiredString("Dispatch phone"),
    dispatchEmail: z.email("Enter a valid dispatch email"),

    // --- Emergency Dispatch Contact ---
    emergencyDispatchName: requiredString("Emergency dispatch name"),
    emergencyDispatchPhone: requiredString("Emergency dispatch phone"),
    emergencyDispatchEmail: z.email("Enter a valid emergency dispatch email"),

    // --- Billing ---
    billingAddress: requiredString("Billing address"),
    billingContactName: requiredString("Billing contact name"),
    billingEmail: z.email("Enter a valid billing email"),
    billingPhone: requiredString("Billing phone"),
    deliveryContactInfo: optionalString,
    billingSystem: optionalString,

    // --- Operations ---
    operatingHours: z.array(z.enum(OPERATING_HOURS)),
    terminalsAvailable: optionalString,
    pricingBasis: z.enum(PRICING_BASIS, { error: "Select a pricing basis" }),
    pricingBasisOther: optionalString,
    areasOwnedTrucks: optionalString,
    areasSubcontracted: optionalString,
    tankwagonsCount: requiredNumber("Number of tankwagons"),
    transportsCount: requiredNumber("Number of transports"),
    annualGallonsDistributed: requiredNumber("Annual gallons distributed"),
    standardOrderLeadTime: requiredString("Standard order lead time"),

    // --- Products Offered ---
    productsOffered: z
      .array(z.enum(PRODUCTS_OFFERED))
      .min(1, "Select at least one product"),
    brandsOffered: optionalString,

    // --- Emergency Services ---
    emergencyRetainerWilling: z.enum(EMERGENCY_RETAINER_OPTIONS, {
      error: "Select an option",
    }),
    emergencyOrderLeadTime: requiredString("Emergency order lead time"),
    emergencyResponseTimes: requiredString("Emergency response times"),

    // --- Delivery Capabilities ---
    deliveryCapabilities: z.array(z.enum(DELIVERY_CAPABILITIES)),

    // --- Additional Services / Technology ---
    additionalServices: z.array(z.enum(ADDITIONAL_SERVICES)),
    otherServices: optionalString,
    wetHoseTicketType: optionalString,
    telematicsSystem: optionalString,
    dispatchSoftware: optionalString,

    // --- Licensed States ---
    licensedStates: z
      .array(z.enum(US_STATES))
      .min(1, "Select at least one licensed state"),
  })

// When pricing basis is "Other", the free-text explanation is required.
const pricingBasisRefinement = (
  data: { pricingBasis?: string; pricingBasisOther?: string },
  ctx: z.RefinementCtx
) => {
  if (data.pricingBasis === "Other" && !data.pricingBasisOther?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["pricingBasisOther"],
      message: "Describe the pricing basis",
    })
  }
}

export const VendorApplicationSchema =
  VendorApplicationObjectSchema.superRefine(pricingBasisRefinement)

export type VendorApplication = z.infer<typeof VendorApplicationSchema>

/**
 * Variant used by the multi-step registration form: file fields are replaced
 * with Supabase Storage references (see `DocumentRefSchema`).
 */
export const VendorRegistrationSchema = VendorApplicationObjectSchema.extend({
  w9Form: DocumentRefSchema,
  certificateOfInsurance: DocumentRefSchema,
  distributorLicense: DocumentRefSchema.optional(),
  companyLogo: DocumentRefSchema.optional(),
}).superRefine(pricingBasisRefinement)

export type VendorRegistration = z.infer<typeof VendorRegistrationSchema>
