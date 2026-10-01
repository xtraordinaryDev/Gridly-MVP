import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { ABBREV_TO_STATE_NAME, STATE_NAME_TO_ABBREV } from "@/lib/directory/state-abbrev"
import { listBuyerSites } from "@/lib/data/sites"
import { fetchEiaWeeklyPrices, isEiaConfigured } from "./eia"
import { cellCenter, cellFor, distanceMiles, neighborCells } from "./geo"
import { fetchNearbyStationPrices, geocodeAddress, isGoogleMapsConfigured } from "./google-places"
import { AREA_LABEL, FUEL_TYPES, areaCandidates, type FuelType } from "./regions"

export type { FuelType } from "./regions"
export { FUEL_TYPE_LABEL } from "./regions"

export interface FuelPricePoint {
  /** $/gal, latest week */
  price: number
  /** $/gal, the week before (null if we only have one week) */
  prior: number | null
  /** ISO date of the latest week */
  asOf: string
  /** EIA area the number comes from — may be broader than the buyer's state */
  areaLabel: string
}

export interface AreaFuelPrices {
  /** USPS state, or "US" when the buyer has no sites with a state */
  key: string
  label: string
  siteCount: number
  prices: Partial<Record<FuelType, FuelPricePoint>>
}

export interface NearbyStation {
  placeId: string
  name: string
  address: string | null
  distanceMiles: number
  prices: Partial<Record<FuelType, { price: number; observedAt: string | null }>>
}

export interface SiteStations {
  siteId: string
  siteName: string
  stations: NearbyStation[]
}

export interface AreaFuelPriceSummary {
  /** unconfigured: no EIA key · empty: key set but nothing fetched yet */
  status: "ok" | "unconfigured" | "empty"
  areas: AreaFuelPrices[]
  fetchedAt: string | null
  /** unconfigured: no Google key · pending: configured, but sites not geocoded or cells not fetched yet */
  stationsStatus: "ok" | "unconfigured" | "pending"
  stations: SiteStations[]
}

const SOURCE = "eia"
const MAX_AREAS = 6
const MAX_STATION_SITES = 4
const STATIONS_PER_SITE = 3
const STATION_MAX_MILES = 10
/** Don't re-fetch a cell more often than this. */
const CELL_TTL_MS = 20 * 3600 * 1000

// ---------------------------------------------------------------------------
// Layer 1 — EIA regional benchmarks
// ---------------------------------------------------------------------------

/** Pull the latest EIA weeks and upsert them. Called by the daily cron. */
export async function refreshRegionalFuelPrices(): Promise<{ upserted: number }> {
  if (!isSupabaseConfigured() || !isEiaConfigured()) return { upserted: 0 }
  const rows = await fetchEiaWeeklyPrices(8)
  if (!rows.length) return { upserted: 0 }

  const fetchedAt = new Date().toISOString()
  const { error } = await createAdminClient()
    .from("fuel_price_snapshots")
    .upsert(
      rows.map((r) => ({
        source: SOURCE,
        scope: r.area.startsWith("S") ? "state" : "region",
        scope_key: r.area,
        area_label: AREA_LABEL[r.area] ?? r.area,
        fuel_type: r.fuel,
        price: r.price,
        observed_at: r.period,
        fetched_at: fetchedAt,
      })),
      { onConflict: "source,scope_key,fuel_type,observed_at" }
    )
  if (error) throw new Error(`fuel_price_snapshots upsert failed: ${error.message}`)
  return { upserted: rows.length }
}

// ---------------------------------------------------------------------------
// Layer 2 — station prices near geocoded sites
// ---------------------------------------------------------------------------

/**
 * Geocode un-located sites, then refresh the oldest station cells. Capped per
 * run so the Places bill stays predictable (1,000 free calls/month ≈ 30/day).
 */
export async function refreshStationFuelPrices(opts: { maxCells?: number } = {}): Promise<{ geocoded: number; cellsRefreshed: number; stationRows: number }> {
  const result = { geocoded: 0, cellsRefreshed: 0, stationRows: 0 }
  if (!isSupabaseConfigured() || !isGoogleMapsConfigured()) return result
  const admin = createAdminClient()
  const maxCells = opts.maxCells ?? 30

  // 1. Geocode sites we haven't tried yet.
  const { data: pending } = await admin.from("buyer_sites").select("id, address, state").is("geocoded_at", null).limit(25)
  for (const s of pending ?? []) {
    const address = [s.address as string, s.state as string | null].filter(Boolean).join(", ")
    try {
      const g = await geocodeAddress(address)
      // Stamp geocoded_at on success *and* on "no such address" so we don't
      // retry an unresolvable address forever. API/config errors leave it null
      // so the next run retries once the problem is fixed.
      const patch: Record<string, unknown> = { geocoded_at: new Date().toISOString() }
      if (g) Object.assign(patch, { lat: g.lat, lng: g.lng, postal_code: g.postalCode, geo_cell: cellFor(g.lat, g.lng) })
      await admin.from("buyer_sites").update(patch).eq("id", s.id as string)
      result.geocoded += g ? 1 : 0
    } catch (err) {
      console.error("[fuel-prices] geocode failed", s.id, err)
      break // same key, same error — don't burn the rest of the batch
    }
  }

  // 2. Make sure every cell with a site exists in fuel_station_cells.
  const { data: siteCells } = await admin.from("buyer_sites").select("geo_cell").not("geo_cell", "is", null)
  const wanted = [...new Set((siteCells ?? []).map((r) => r.geo_cell as string))]
  if (!wanted.length) return result
  await admin.from("fuel_station_cells").upsert(
    wanted.map((c) => ({ geo_cell: c, ...cellCenter(c) })),
    { onConflict: "geo_cell", ignoreDuplicates: true }
  )

  // 3. Refresh the stalest cells, oldest first.
  const cutoff = new Date(Date.now() - CELL_TTL_MS).toISOString()
  const { data: due } = await admin
    .from("fuel_station_cells")
    .select("geo_cell, lat, lng, fetched_at")
    .in("geo_cell", wanted)
    .or(`fetched_at.is.null,fetched_at.lt.${cutoff}`)
    .order("fetched_at", { ascending: true, nullsFirst: true })
    .limit(maxCells)

  for (const cell of due ?? []) {
    const key = cell.geo_cell as string
    try {
      const stations = await fetchNearbyStationPrices({ lat: cell.lat as number, lng: cell.lng as number })
      const fetchedAt = new Date().toISOString()
      if (stations.length) {
        const { error } = await admin.from("fuel_station_prices").upsert(
          stations.map((s) => ({
            place_id: s.placeId,
            fuel_type: s.fuel,
            geo_cell: key,
            name: s.name,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            price: s.price,
            observed_at: s.observedAt,
            fetched_at: fetchedAt,
          })),
          { onConflict: "place_id,fuel_type" }
        )
        if (error) throw new Error(error.message)
      }
      await admin.from("fuel_station_cells").update({ fetched_at: fetchedAt, station_count: new Set(stations.map((s) => s.placeId)).size, last_error: null }).eq("geo_cell", key)
      result.cellsRefreshed += 1
      result.stationRows += stations.length
    } catch (err) {
      console.error("[fuel-prices] cell refresh failed", key, err)
      // Stamp fetched_at so one bad cell can't eat the whole daily budget on retries.
      await admin.from("fuel_station_cells").update({ fetched_at: new Date().toISOString(), last_error: String(err).slice(0, 500) }).eq("geo_cell", key)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Read side — what the dashboard renders
// ---------------------------------------------------------------------------

/** Accepts "Minnesota" or "MN"; returns "MN" or null. */
function toAbbrev(state: string | null): string | null {
  if (!state) return null
  const t = state.trim()
  if (!t) return null
  if (t.length === 2 && t.toUpperCase() in ABBREV_TO_STATE_NAME) return t.toUpperCase()
  return STATE_NAME_TO_ABBREV[t] ?? STATE_NAME_TO_ABBREV[t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()] ?? null
}

type SeriesMap = Map<string, { observed_at: string; price: number }[]> // `${area}|${fuel}` → desc by week

function pointFor(series: SeriesMap, state: string | null, fuel: FuelType): FuelPricePoint | null {
  for (const area of areaCandidates(state)) {
    const rows = series.get(`${area}|${fuel}`)
    if (!rows?.length) continue
    return { price: rows[0].price, prior: rows[1]?.price ?? null, asOf: rows[0].observed_at, areaLabel: AREA_LABEL[area] ?? area }
  }
  return null
}

async function regionalPart(buyerId: string): Promise<Pick<AreaFuelPriceSummary, "status" | "areas" | "fetchedAt">> {
  const sites = await listBuyerSites(buyerId)
  const siteCountByState = new Map<string, number>()
  for (const s of sites) {
    const k = toAbbrev(s.state) ?? "US"
    siteCountByState.set(k, (siteCountByState.get(k) ?? 0) + 1)
  }
  if (siteCountByState.size === 0) siteCountByState.set("US", 0)

  const since = new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10)
  const { data } = await createAdminClient()
    .from("fuel_price_snapshots")
    .select("scope_key, fuel_type, price, observed_at, fetched_at")
    .eq("source", SOURCE)
    .gte("observed_at", since)
    .order("observed_at", { ascending: false })

  if (!data?.length) return { status: isEiaConfigured() ? "empty" : "unconfigured", areas: [], fetchedAt: null }

  const series: SeriesMap = new Map()
  let fetchedAt: string | null = null
  for (const r of data) {
    const k = `${r.scope_key as string}|${r.fuel_type as string}`
    const list = series.get(k) ?? []
    list.push({ observed_at: r.observed_at as string, price: Number(r.price) })
    series.set(k, list)
    const f = r.fetched_at as string
    if (!fetchedAt || f > fetchedAt) fetchedAt = f
  }

  const areas: AreaFuelPrices[] = [...siteCountByState.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_AREAS)
    .map(([key, siteCount]) => {
      const state = key === "US" ? null : key
      const prices: AreaFuelPrices["prices"] = {}
      for (const fuel of FUEL_TYPES) {
        const p = pointFor(series, state, fuel)
        if (p) prices[fuel] = p
      }
      return { key, label: state ? ABBREV_TO_STATE_NAME[state] : "U.S. average", siteCount, prices }
    })
    .filter((a) => Object.keys(a.prices).length > 0)

  return { status: "ok", areas, fetchedAt }
}

async function stationsPart(buyerId: string): Promise<Pick<AreaFuelPriceSummary, "stationsStatus" | "stations">> {
  if (!isGoogleMapsConfigured()) return { stationsStatus: "unconfigured", stations: [] }
  const admin = createAdminClient()

  const { data: sites } = await admin
    .from("buyer_sites")
    .select("id, name, lat, lng, geo_cell")
    .eq("buyer_id", buyerId)
    .not("lat", "is", null)
    .order("name")
    .limit(MAX_STATION_SITES)
  if (!sites?.length) return { stationsStatus: "pending", stations: [] }

  const cells = [...new Set(sites.flatMap((s) => neighborCells(s.geo_cell as string)))]
  const { data: rows } = await admin
    .from("fuel_station_prices")
    .select("place_id, fuel_type, name, address, lat, lng, price, observed_at")
    .in("geo_cell", cells)
  if (!rows?.length) return { stationsStatus: "pending", stations: [] }

  // Fold fuel rows into one record per station.
  const byPlace = new Map<string, Omit<NearbyStation, "distanceMiles"> & { lat: number; lng: number }>()
  for (const r of rows) {
    const id = r.place_id as string
    const rec = byPlace.get(id) ?? { placeId: id, name: r.name as string, address: (r.address as string) ?? null, lat: r.lat as number, lng: r.lng as number, prices: {} }
    rec.prices[r.fuel_type as FuelType] = { price: Number(r.price), observedAt: (r.observed_at as string) ?? null }
    byPlace.set(id, rec)
  }

  const stations: SiteStations[] = sites.map((s) => {
    const here = { lat: s.lat as number, lng: s.lng as number }
    const near = [...byPlace.values()]
      .map(({ lat, lng, ...rest }) => ({ ...rest, distanceMiles: Math.round(distanceMiles(here, { lat, lng }) * 10) / 10 }))
      .filter((st) => st.distanceMiles <= STATION_MAX_MILES)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, STATIONS_PER_SITE)
    return { siteId: s.id as string, siteName: s.name as string, stations: near }
  })

  return { stationsStatus: "ok", stations }
}

export async function getAreaFuelPrices(buyerId: string): Promise<AreaFuelPriceSummary> {
  if (!isSupabaseConfigured()) return MOCK_SUMMARY
  const [regional, stations] = await Promise.all([regionalPart(buyerId), stationsPart(buyerId)])
  return { ...regional, ...stations }
}

// ---------------------------------------------------------------------------

const MOCK_SUMMARY: AreaFuelPriceSummary = {
  status: "ok",
  fetchedAt: new Date().toISOString(),
  areas: [
    {
      key: "MN",
      label: "Minnesota",
      siteCount: 3,
      prices: {
        diesel: { price: 3.712, prior: 3.668, asOf: "2026-09-21", areaLabel: AREA_LABEL.R20 },
        gasoline_regular: { price: 3.054, prior: 3.081, asOf: "2026-09-21", areaLabel: AREA_LABEL.SMN },
      },
    },
    {
      key: "WI",
      label: "Wisconsin",
      siteCount: 1,
      prices: {
        diesel: { price: 3.712, prior: 3.668, asOf: "2026-09-21", areaLabel: AREA_LABEL.R20 },
        gasoline_regular: { price: 3.118, prior: 3.118, asOf: "2026-09-21", areaLabel: AREA_LABEL.R20 },
      },
    },
  ],
  stationsStatus: "ok",
  stations: [
    {
      siteId: "site-1",
      siteName: "Heywood Garage",
      stations: [
        { placeId: "m1", name: "Holiday Stationstores", address: "1225 Washington Ave N, Minneapolis", distanceMiles: 0.6, prices: { diesel: { price: 3.649, observedAt: null }, gasoline_regular: { price: 2.999, observedAt: null } } },
        { placeId: "m2", name: "Speedway", address: "2401 N 2nd St, Minneapolis", distanceMiles: 1.1, prices: { diesel: { price: 3.699, observedAt: null }, gasoline_regular: { price: 3.019, observedAt: null } } },
        { placeId: "m3", name: "Kwik Trip", address: "3001 Lyndale Ave N, Minneapolis", distanceMiles: 1.8, prices: { gasoline_regular: { price: 2.979, observedAt: null } } },
      ],
    },
    {
      siteId: "site-2",
      siteName: "Transfer Rd Depot",
      stations: [
        { placeId: "s1", name: "Pilot Travel Center", address: "2000 Energy Park Dr, St. Paul", distanceMiles: 0.9, prices: { diesel: { price: 3.589, observedAt: null }, gasoline_regular: { price: 3.049, observedAt: null } } },
        { placeId: "s2", name: "Holiday Stationstores", address: "1450 University Ave W, St. Paul", distanceMiles: 1.4, prices: { diesel: { price: 3.679, observedAt: null }, gasoline_regular: { price: 3.029, observedAt: null } } },
      ],
    },
  ],
}
