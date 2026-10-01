import "server-only"

import { ALL_AREAS, FUEL_TYPES, parseSeriesId, seriesId, type FuelType } from "./regions"

export interface EiaPriceRow {
  area: string
  fuel: FuelType
  /** ISO date of the week EIA reports (Monday) */
  period: string
  /** $/gal */
  price: number
}

const ENDPOINT = "https://api.eia.gov/v2/petroleum/pri/gnd/data/"

export function isEiaConfigured() {
  return !!process.env.EIA_API_KEY?.trim()
}

/**
 * Pull the last `weeks` of weekly retail prices for every area/fuel we track.
 * One request; EIA returns rows only for series that exist, so asking for a
 * state/fuel combination it doesn't publish is harmless.
 */
export async function fetchEiaWeeklyPrices(weeks = 8): Promise<EiaPriceRow[]> {
  const key = process.env.EIA_API_KEY?.trim()
  if (!key) throw new Error("EIA_API_KEY is not set")

  const start = new Date(Date.now() - weeks * 7 * 86400000).toISOString().slice(0, 10)
  const params = new URLSearchParams({
    api_key: key,
    frequency: "weekly",
    "data[0]": "value",
    start,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    length: "5000",
  })
  for (const area of ALL_AREAS) for (const fuel of FUEL_TYPES) params.append("facets[series][]", seriesId(fuel, area))

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`EIA request failed: ${res.status}`)
  const body = (await res.json()) as { response?: { data?: Array<Record<string, unknown>> }; error?: string }
  if (body.error) throw new Error(`EIA error: ${body.error}`)

  const rows: EiaPriceRow[] = []
  for (const r of body.response?.data ?? []) {
    const parsed = parseSeriesId(String(r.series ?? ""))
    const price = Number(r.value)
    const period = String(r.period ?? "")
    if (!parsed || !Number.isFinite(price) || price <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(period)) continue
    rows.push({ area: parsed.area, fuel: parsed.fuel, period, price })
  }
  return rows
}
