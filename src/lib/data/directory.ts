import "server-only"

import {
  DELIVERY_CAPABILITIES,
  PRODUCTS_OFFERED,
  SPECIAL_CERTIFICATIONS,
  US_STATES,
} from "@/lib/schemas/vendor-application"
import type { DirectoryVendor } from "@/lib/directory/shared"
import type { VendorPublicProfile } from "@/lib/directory/profile"
import {
  ADDITIONAL_SERVICES,
  ENTITY_TYPES,
  OPERATING_HOURS,
  ORGANIZATION_TYPES,
} from "@/lib/schemas/vendor-application"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export {
  DIRECTORY_TOTAL_VERIFIED,
  filterDirectory,
  DIRECTORY_FILTER_OPTIONS,
  DEFAULT_DIRECTORY_FILTERS,
} from "@/lib/directory/shared"
export type {
  DirectoryVendor,
  DirectoryFilters,
  DirectorySort,
  EmergencyFilter,
} from "@/lib/directory/shared"
export type { VendorPublicProfile } from "@/lib/directory/profile"

const NAMES = [
  "Apex Fuel Co.",
  "Heartland Energy Partners",
  "Gulfstream Fuels",
  "Coastal Energy Logistics",
  "Summit Petroleum LLC",
  "Prairie States Petroleum",
  "Lakefront Fuel Services",
  "Mountain West Energy",
  "Delta Fuel Transport",
  "Twin Cities Fuel Co.",
  "Keystone Petroleum LLC",
  "Bayou Fuel Partners",
  "Harbor City Petroleum",
  "Vanguard Fuels",
  "Sterling Fuel Group",
  "Meridian Fuels",
  "Pioneer Fuel Co.",
  "Western States Petroleum",
  "Iron Range Oil & Gas",
  "Sunbelt Petroleum Group",
]

const CERTS = SPECIAL_CERTIFICATIONS.filter((c) => c !== "None")
const CAPS = DELIVERY_CAPABILITIES.slice(0, 8)
const FUELS = PRODUCTS_OFFERED.filter((p) =>
  ["Gas", "Premium Gas", "Diesel", "Dyed Diesel", "DEF", "Jet Fuel", "Marine Fuel", "Propane", "Bio-Diesel", "Heating Oil"].includes(p)
)

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function buildMockDirectory(): DirectoryVendor[] {
  const rand = seededRandom(42)
  const vendors: DirectoryVendor[] = []

  for (let i = 0; i < 60; i++) {
    const baseName = NAMES[i % NAMES.length]
    const companyName = i < NAMES.length ? baseName : `${baseName.replace(/ LLC| Co\./, "")} ${i + 1}`
    const stateCount = 2 + Math.floor(rand() * 6)
    const stateSet = new Set<string>()
    while (stateSet.size < stateCount) {
      stateSet.add(US_STATES[Math.floor(rand() * US_STATES.length)])
    }
    const products: string[] = []
    while (products.length < 2 + Math.floor(rand() * 3)) {
      const p = FUELS[Math.floor(rand() * FUELS.length)]
      if (!products.includes(p)) products.push(p)
    }
    const capabilities: string[] = []
    while (capabilities.length < 1 + Math.floor(rand() * 2)) {
      const c = CAPS[Math.floor(rand() * CAPS.length)]
      if (!capabilities.includes(c)) capabilities.push(c)
    }
    const emergencyOptions = [2, 4, 8, 24, null] as const
    const nationwide = rand() > 0.88

    vendors.push({
      id: `vendor-dir-${i}`,
      companyName,
      description:
        "Verified fuel supplier with regional delivery, emergency dispatch, and compliance documentation on file with GridLink.",
      states: nationwide ? ["Illinois", "Indiana", "Wisconsin", "Iowa", "Minnesota"] : [...stateSet],
      products,
      deliveryCapabilities: capabilities,
      specialCertification: rand() > 0.55 ? CERTS[Math.floor(rand() * CERTS.length)] : null,
      nationwide,
      tankwagons: Math.floor(rand() * 25),
      transports: Math.floor(rand() * 40),
      annualGallons: Math.floor(rand() * 120_000_000) + 500_000,
      emergencyHours: emergencyOptions[Math.floor(rand() * emergencyOptions.length)],
      verifiedAt: new Date(Date.now() - Math.floor(rand() * 400) * 86400000).toISOString(),
    })
  }

  return vendors
}

const MOCK_DIRECTORY = buildMockDirectory()

function rowToDirectory(row: Record<string, unknown>): DirectoryVendor {
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])
  const emergencyText = (row.emergency_order_lead_time as string) ?? ""
  let emergencyHours: number | null = null
  const match = emergencyText.match(/(\d+)/)
  if (match) emergencyHours = Number(match[1])

  return {
    id: row.id as string,
    companyName: (row.company_name as string) ?? "",
    description: (row.description as string) ?? null,
    states: arr(row.licensed_states),
    products: arr(row.products_offered),
    deliveryCapabilities: arr(row.delivery_capabilities),
    specialCertification: (row.special_certification as string) ?? null,
    nationwide: Boolean(row.nationwide),
    tankwagons: (row.tankwagons_count as number) ?? 0,
    transports: (row.transports_count as number) ?? 0,
    annualGallons: Number(row.annual_gallons_distributed) || 0,
    emergencyHours,
    verifiedAt: (row.verified_at as string) ?? new Date().toISOString(),
  }
}

function hashSeed(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

function enrichPublicProfile(vendor: DirectoryVendor, row?: Record<string, unknown>): VendorPublicProfile {
  const seed = hashSeed(vendor.id)
  const pick = <T,>(arr: readonly T[], offset = 0) => arr[(seed + offset) % arr.length]
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])

  const stateInc =
    (row?.state_of_incorporation as string) ?? vendor.states[0] ?? "Minnesota"
  const entityType = (row?.entity_type as string) ?? pick(ENTITY_TYPES)
  const orgTypes = arr(row?.organization_type).length
    ? arr(row?.organization_type)
    : [pick(ORGANIZATION_TYPES), pick(ORGANIZATION_TYPES, 1)].filter(
        (v, i, a) => a.indexOf(v) === i
      )

  const certs: string[] = []
  if (vendor.specialCertification && vendor.specialCertification !== "None") {
    certs.push(vendor.specialCertification)
  }
  if (seed % 3 === 0) certs.push("Veteran-Owned")

  const verified = new Date(vendor.verifiedAt)
  const lastReviewed = new Date(verified)
  lastReviewed.setDate(lastReviewed.getDate() + 30 + (seed % 60))

  const coiExpiry = new Date()
  coiExpiry.setMonth(coiExpiry.getMonth() + (seed % 5 === 0 ? 1 : 8))

  const licenseExpiry = new Date()
  licenseExpiry.setMonth(licenseExpiry.getMonth() - (seed % 7 === 0 ? 2 : 6))

  const complianceStatus = (monthsOut: number): VendorPublicProfile["compliance"][0]["status"] => {
    if (monthsOut < 0) return "expired"
    if (monthsOut <= 2) return "expires_soon"
    return "valid"
  }

  const coiMonths = Math.round(
    (coiExpiry.getTime() - Date.now()) / (30 * 86400000)
  )
  const licMonths = Math.round(
    (licenseExpiry.getTime() - Date.now()) / (30 * 86400000)
  )

  const emergencyLabel =
    vendor.emergencyHours != null
      ? `Under ${vendor.emergencyHours} hours`
      : "Contact for availability"

  return {
    ...vendor,
    logoUrl: null,
    tagline: `${stateInc} · ${entityType}`,
    stateOfIncorporation: stateInc,
    entityType,
    yearFounded: (row?.year_founded as number) ?? 1985 + (seed % 35),
    organizationTypes: orgTypes,
    certifications: certs,
    websiteUrl: (row?.website_url as string) ?? `https://www.${vendor.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`,
    lastReviewedAt: lastReviewed.toISOString(),
    brandsOffered: (row?.brands_offered as string)?.split(",").map((s) => s.trim()).filter(Boolean) ?? [
      "Shell",
      "Chevron",
      "Exxon",
    ].slice(0, 1 + (seed % 3)),
    terminals: ((row?.terminals_available as string) ?? "Chicago, IL; Minneapolis, MN; Des Moines, IA")
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean),
    areasOwnedTrucks:
      (row?.areas_owned_trucks as string) ??
      (vendor.nationwide ? "Nationwide fleet" : vendor.states.slice(0, 3).join(", ")),
    areasSubcontracted:
      (row?.areas_subcontracted as string) ?? "Remote / overflow coverage via partner carriers",
    techCapabilities: arr(row?.additional_services).length
      ? arr(row?.additional_services)
      : ADDITIONAL_SERVICES.slice(0, 2 + (seed % 4)),
    standardLeadTime: (row?.standard_order_lead_time as string) ?? "24–48 hours",
    operatingHours: arr(row?.operating_hours).length
      ? arr(row?.operating_hours)
      : [pick(OPERATING_HOURS), pick(OPERATING_HOURS, 2)],
    pricingBasis: "OPIS GCA 10am",
    emergencyRetainer: seed % 2 === 0 ? "Yes" : "Possibly",
    emergencyResponseTimes:
      (row?.emergency_response_times as string) ?? emergencyLabel,
    emergencyPricingTiers:
      "Standard emergency surcharge · After-hours dispatch fee · Retainer pricing available",
    compliance: [
      {
        type: "w9",
        label: "W-9 on file",
        status: "valid",
        expiresAt: null,
      },
      {
        type: "coi",
        label: "Certificate of insurance",
        status: complianceStatus(coiMonths),
        expiresAt: coiExpiry.toISOString(),
      },
      {
        type: "distributor_license",
        label: "Distributor license",
        status: complianceStatus(licMonths),
        expiresAt: licenseExpiry.toISOString(),
      },
    ],
    contacts: [
      {
        role: "Sales",
        name: "Jordan Ellis",
        email: `sales@${vendor.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        phone: "(612) 555-0100",
      },
      {
        role: "Dispatch",
        name: "Morgan Lee",
        email: `dispatch@${vendor.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        phone: "(612) 555-0101",
      },
      {
        role: "Emergency dispatch",
        name: "24/7 Operations",
        email: `emergency@${vendor.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        phone: "(612) 555-0199",
      },
      {
        role: "Billing",
        name: "Accounts Payable",
        email: `billing@${vendor.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        phone: "(612) 555-0102",
      },
    ],
  }
}

export async function getVendorPublicProfile(vendorId: string): Promise<VendorPublicProfile | null> {
  if (!isSupabaseConfigured()) {
    const vendor = MOCK_DIRECTORY.find((v) => v.id === vendorId)
    return vendor ? enrichPublicProfile(vendor) : null
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .eq("is_verified", true)
    .maybeSingle()

  if (!data) {
    const vendor = MOCK_DIRECTORY.find((v) => v.id === vendorId)
    return vendor ? enrichPublicProfile(vendor) : null
  }

  return enrichPublicProfile(rowToDirectory(data as Record<string, unknown>), data as Record<string, unknown>)
}

export async function listVerifiedVendors(): Promise<DirectoryVendor[]> {
  if (!isSupabaseConfigured()) return MOCK_DIRECTORY

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("is_verified", true)
    .order("company_name")

  if (!data?.length) return MOCK_DIRECTORY
  return data.map(rowToDirectory)
}
