/**
 * Opportunity-digest matching. Pure so the cron route and tests can share it.
 * An empty fuel/state preference means "no filter", not "nothing".
 */

export interface DigestPrefs {
  fuelTypes: string[]
  states: string[]
  minGallons: number
}

export interface DigestRfp {
  fuelType: string | null
  quantityGallons: number
  deliveryStates: string[]
}

// RFP fuel types and vendor product names are separate lists; these are the
// RFP types whose name doesn't appear verbatim among the products.
const FUEL_ALIASES: Record<string, string[]> = {
  "renewable diesel": ["renewable fuel", "bio-diesel"],
}

const norm = (s: string) => s.trim().toLowerCase()

export function matchesDigestPrefs(rfp: DigestRfp, prefs: DigestPrefs): boolean {
  if (prefs.minGallons > 0 && rfp.quantityGallons < prefs.minGallons) return false

  if (prefs.fuelTypes.length) {
    const wanted = new Set(prefs.fuelTypes.map(norm))
    // An RFP may list several fuels ("Diesel, DEF"); any one matching is enough.
    const fuels = (rfp.fuelType ?? "").split(",").map(norm).filter(Boolean)
    const hit = fuels.some((f) => wanted.has(f) || (FUEL_ALIASES[f] ?? []).some((a) => wanted.has(a)))
    if (fuels.length && !hit) return false
  }

  if (prefs.states.length && rfp.deliveryStates.length) {
    const wanted = new Set(prefs.states.map(norm))
    if (!rfp.deliveryStates.some((s) => wanted.has(norm(s)))) return false
  }
  return true
}
