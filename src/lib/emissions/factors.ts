/**
 * Scope 1 emission factors for purchased fuel, kg CO2e per US gallon.
 *
 * Source: US EPA GHG Emission Factors Hub (stationary/mobile combustion,
 * CO2 + CH4 + N2O expressed as CO2e). Renewable diesel and biodiesel burn like
 * diesel, but their biogenic carbon is credited on a lifecycle basis; we use a
 * conservative net factor (~70% below diesel) and flag them as renewable.
 */
export interface FuelFactor {
  key: string
  label: string
  kgPerGallon: number
  renewable: boolean
  note?: string
}

export const DIESEL_KG_PER_GAL = 10.21

const FACTORS: FuelFactor[] = [
  { key: "diesel", label: "Diesel", kgPerGallon: 10.21, renewable: false },
  { key: "dyed diesel", label: "Dyed Diesel", kgPerGallon: 10.21, renewable: false },
  { key: "heating oil", label: "Heating Oil", kgPerGallon: 10.21, renewable: false, note: "Distillate fuel oil No. 2" },
  { key: "gas", label: "Gasoline", kgPerGallon: 8.78, renewable: false },
  { key: "premium gas", label: "Premium Gasoline", kgPerGallon: 8.78, renewable: false },
  { key: "jet fuel", label: "Jet Fuel", kgPerGallon: 9.75, renewable: false, note: "Kerosene-type jet fuel" },
  { key: "propane", label: "Propane", kgPerGallon: 5.72, renewable: false },
  { key: "marine fuel", label: "Marine Fuel", kgPerGallon: 11.27, renewable: false, note: "Residual fuel oil No. 6" },
  { key: "def", label: "DEF", kgPerGallon: 0, renewable: false, note: "Diesel exhaust fluid is not combusted" },
  { key: "renewable diesel", label: "Renewable Diesel", kgPerGallon: 3.06, renewable: true, note: "Net lifecycle CO2e, ~70% below diesel" },
  { key: "renewable fuel", label: "Renewable Fuel", kgPerGallon: 3.06, renewable: true, note: "Net lifecycle CO2e, ~70% below diesel" },
  { key: "biodiesel", label: "Biodiesel", kgPerGallon: 3.06, renewable: true, note: "Net lifecycle CO2e, ~70% below diesel" },
]

export const EMISSION_FACTOR_SOURCE = "US EPA GHG Emission Factors Hub; renewables credited on a lifecycle basis"

/** Resolve a factor for any fuel-type string used in RFPs/contracts. */
export function factorFor(fuelType: string | null | undefined): FuelFactor {
  const f = (fuelType ?? "").trim().toLowerCase()
  const exact = FACTORS.find((x) => x.key === f)
  if (exact) return exact
  if (f.includes("renewable") || f.includes("bio") || /\br\d{2}\b/.test(f)) return FACTORS.find((x) => x.key === "renewable diesel")!
  if (f.includes("def") || f.includes("exhaust")) return FACTORS.find((x) => x.key === "def")!
  if (f.includes("jet") || f.includes("kerosene")) return FACTORS.find((x) => x.key === "jet fuel")!
  if (f.includes("propane") || f.includes("lpg")) return FACTORS.find((x) => x.key === "propane")!
  if (f.includes("marine") || f.includes("bunker") || f.includes("residual")) return FACTORS.find((x) => x.key === "marine fuel")!
  if (f.includes("gas") || f.includes("unleaded") || f.includes("petrol")) return FACTORS.find((x) => x.key === "gas")!
  if (f.includes("heating") || f.includes("fuel oil")) return FACTORS.find((x) => x.key === "heating oil")!
  return FACTORS.find((x) => x.key === "diesel")!
}

/** Metric tons CO2e for a quantity of fuel. */
export function tonsFor(fuelType: string | null | undefined, gallons: number): number {
  return (factorFor(fuelType).kgPerGallon * gallons) / 1000
}

export function formatTons(t: number) {
  if (t >= 1000) return `${(t / 1000).toFixed(2)}k t`
  if (t >= 100) return `${Math.round(t).toLocaleString("en-US")} t`
  return `${t.toFixed(1)} t`
}
