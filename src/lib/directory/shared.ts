import {
  DELIVERY_CAPABILITIES,
  PRODUCTS_OFFERED,
  SPECIAL_CERTIFICATIONS,
  US_STATES,
} from "@/lib/schemas/vendor-application"

export const DIRECTORY_TOTAL_VERIFIED = 312

export type EmergencyFilter = "any" | "2" | "4" | "8" | "24"

export type DirectorySort = "relevance" | "volume" | "verified" | "az"

export interface DirectoryVendor {
  id: string
  companyName: string
  description: string | null
  states: string[]
  products: string[]
  deliveryCapabilities: string[]
  specialCertification: string | null
  nationwide: boolean
  tankwagons: number
  transports: number
  annualGallons: number
  emergencyHours: number | null
  verifiedAt: string
}

export interface DirectoryFilters {
  search: string
  states: string[]
  products: string[]
  capabilities: string[]
  certifications: string[]
  gallonsMin: number
  gallonsMax: number
  emergency: EmergencyFilter
  fleetMin: number
  fleetMax: number
  nationwideOnly: boolean
  sort: DirectorySort
}

export const DEFAULT_DIRECTORY_FILTERS: DirectoryFilters = {
  search: "",
  states: [],
  products: [],
  capabilities: [],
  certifications: [],
  gallonsMin: 0,
  gallonsMax: 500_000_000,
  emergency: "any",
  fleetMin: 0,
  fleetMax: 200,
  nationwideOnly: false,
  sort: "relevance",
}

export function filterDirectory(
  vendors: DirectoryVendor[],
  filters: DirectoryFilters
): DirectoryVendor[] {
  const q = filters.search.trim().toLowerCase()

  let result = vendors.filter((v) => {
    if (filters.nationwideOnly && !v.nationwide) return false

    if (q) {
      const hay = `${v.companyName} ${v.description ?? ""} ${v.products.join(" ")}`.toLowerCase()
      if (!hay.includes(q)) return false
    }

    if (filters.states.length && !filters.states.some((s) => v.states.includes(s))) {
      return false
    }

    if (filters.products.length && !filters.products.some((p) => v.products.includes(p))) {
      return false
    }

    if (
      filters.capabilities.length &&
      !filters.capabilities.some((c) => v.deliveryCapabilities.includes(c))
    ) {
      return false
    }

    if (filters.certifications.length) {
      if (!v.specialCertification || !filters.certifications.includes(v.specialCertification)) {
        return false
      }
    }

    if (v.annualGallons < filters.gallonsMin || v.annualGallons > filters.gallonsMax) {
      return false
    }

    const fleet = v.tankwagons + v.transports
    if (fleet < filters.fleetMin || fleet > filters.fleetMax) return false

    if (filters.emergency !== "any") {
      const maxH = Number(filters.emergency)
      if (v.emergencyHours === null || v.emergencyHours > maxH) return false
    }

    return true
  })

  switch (filters.sort) {
    case "volume":
      result = [...result].sort((a, b) => b.annualGallons - a.annualGallons)
      break
    case "verified":
      result = [...result].sort(
        (a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()
      )
      break
    case "az":
      result = [...result].sort((a, b) => a.companyName.localeCompare(b.companyName))
      break
    default:
      if (q) {
        result = [...result].sort((a, b) => {
          const aName = a.companyName.toLowerCase().startsWith(q) ? 0 : 1
          const bName = b.companyName.toLowerCase().startsWith(q) ? 0 : 1
          return aName - bName || b.annualGallons - a.annualGallons
        })
      }
  }

  return result
}

export const DIRECTORY_FILTER_OPTIONS = {
  states: US_STATES,
  products: PRODUCTS_OFFERED,
  capabilities: DELIVERY_CAPABILITIES,
  certifications: SPECIAL_CERTIFICATIONS.filter((c) => c !== "None"),
  emergency: [
    { value: "any", label: "Any" },
    { value: "2", label: "Under 2 hours" },
    { value: "4", label: "Under 4 hours" },
    { value: "8", label: "Under 8 hours" },
    { value: "24", label: "Under 24 hours" },
  ] as const,
  gallonsMax: 500_000_000,
  fleetMax: 200,
}
