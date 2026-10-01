/**
 * EIA "Gasoline and Diesel Fuel Update" geography. EIA publishes weekly retail
 * averages for the U.S., PADD regions (with PADD 1 split into sub-districts),
 * and a handful of states. A buyer's site resolves to the most specific area
 * EIA covers: its state if EIA publishes one, otherwise its PADD.
 */

export const FUEL_TYPES = ["diesel", "gasoline_regular"] as const
export type FuelType = (typeof FUEL_TYPES)[number]

export const FUEL_TYPE_LABEL: Record<FuelType, string> = {
  diesel: "Diesel (No. 2)",
  gasoline_regular: "Regular gasoline",
}

/** EIA area code → human label. */
export const AREA_LABEL: Record<string, string> = {
  NUS: "U.S. average",
  R1X: "New England (PADD 1A)",
  R1Y: "Central Atlantic (PADD 1B)",
  R1Z: "Lower Atlantic (PADD 1C)",
  R20: "Midwest (PADD 2)",
  R30: "Gulf Coast (PADD 3)",
  R40: "Rocky Mountain (PADD 4)",
  R50: "West Coast (PADD 5)",
  SCA: "California",
  SCO: "Colorado",
  SFL: "Florida",
  SMA: "Massachusetts",
  SMN: "Minnesota",
  SNY: "New York",
  SOH: "Ohio",
  STX: "Texas",
  SWA: "Washington",
}

/** USPS state → PADD sub-district code. */
const PADD_BY_STATE: Record<string, string> = {
  CT: "R1X", ME: "R1X", MA: "R1X", NH: "R1X", RI: "R1X", VT: "R1X",
  DE: "R1Y", DC: "R1Y", MD: "R1Y", NJ: "R1Y", NY: "R1Y", PA: "R1Y",
  FL: "R1Z", GA: "R1Z", NC: "R1Z", SC: "R1Z", VA: "R1Z", WV: "R1Z",
  IL: "R20", IN: "R20", IA: "R20", KS: "R20", KY: "R20", MI: "R20", MN: "R20", MO: "R20",
  NE: "R20", ND: "R20", OH: "R20", OK: "R20", SD: "R20", TN: "R20", WI: "R20",
  AL: "R30", AR: "R30", LA: "R30", MS: "R30", NM: "R30", TX: "R30",
  CO: "R40", ID: "R40", MT: "R40", UT: "R40", WY: "R40",
  AK: "R50", AZ: "R50", CA: "R50", HI: "R50", NV: "R50", OR: "R50", WA: "R50",
}

/** States EIA publishes their own weekly series for. */
const STATE_AREA: Record<string, string> = {
  CA: "SCA", CO: "SCO", FL: "SFL", MA: "SMA", MN: "SMN", NY: "SNY", OH: "SOH", TX: "STX", WA: "SWA",
}

/**
 * Areas to try for a state, most specific first. Not every area publishes
 * every fuel (EIA only breaks diesel out for California among states), so
 * callers walk the list until they find data.
 */
export function areaCandidates(state: string | null): string[] {
  const out: string[] = []
  if (state) {
    const s = STATE_AREA[state]
    if (s) out.push(s)
    const p = PADD_BY_STATE[state]
    if (p) out.push(p)
  }
  out.push("NUS")
  return out
}

export const ALL_AREAS = Object.keys(AREA_LABEL)

/** EIA v2 series id for a fuel in an area. */
export function seriesId(fuel: FuelType, area: string): string {
  return fuel === "diesel" ? `EMD_EPD2D_PTE_${area}_DPG` : `EMM_EPMR_PTE_${area}_DPG`
}

/** Reverse of seriesId. Returns null for series we don't track. */
export function parseSeriesId(series: string): { fuel: FuelType; area: string } | null {
  const m = /^(EMD_EPD2D|EMM_EPMR)_PTE_([A-Z0-9]+)_DPG$/.exec(series)
  if (!m || !(m[2] in AREA_LABEL)) return null
  return { fuel: m[1] === "EMD_EPD2D" ? "diesel" : "gasoline_regular", area: m[2] }
}
