import type { DirectoryVendor } from "@/lib/directory/shared"

export function matchVerifiedSuppliers(
  vendors: DirectoryVendor[],
  filters: {
    states: string[]
    capabilities: string[]
    certifications: string[]
  }
): DirectoryVendor[] {
  return vendors.filter((v) => {
    if (filters.states.length && !filters.states.some((s) => v.states.includes(s))) {
      return false
    }
    if (
      filters.capabilities.length &&
      !filters.capabilities.some((c) => v.deliveryCapabilities.includes(c))
    ) {
      return false
    }
    if (filters.certifications.length) {
      const cert = v.specialCertification
      if (!cert || cert === "None" || !filters.certifications.includes(cert)) {
        return false
      }
    }
    return true
  })
}
