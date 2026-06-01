import type { DirectoryVendor } from "./shared"

export type ComplianceDocStatus = "valid" | "expires_soon" | "expired"

export interface ComplianceAttestation {
  type: "w9" | "coi" | "distributor_license"
  label: string
  status: ComplianceDocStatus
  expiresAt: string | null
}

export interface VendorContact {
  role: string
  name: string
  email: string
  phone: string
}

export interface VendorPublicProfile extends DirectoryVendor {
  logoUrl: string | null
  tagline: string
  stateOfIncorporation: string
  entityType: string
  yearFounded: number | null
  organizationTypes: string[]
  certifications: string[]
  websiteUrl: string | null
  lastReviewedAt: string
  brandsOffered: string[]
  terminals: string[]
  areasOwnedTrucks: string
  areasSubcontracted: string
  techCapabilities: string[]
  standardLeadTime: string
  operatingHours: string[]
  pricingBasis: string
  emergencyRetainer: string
  emergencyResponseTimes: string
  emergencyPricingTiers: string
  compliance: ComplianceAttestation[]
  contacts: VendorContact[]
}

export function formatProfileDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function complianceStatusLabel(status: ComplianceDocStatus) {
  switch (status) {
    case "valid":
      return "Valid"
    case "expires_soon":
      return "Expires soon"
    case "expired":
      return "Expired"
  }
}
