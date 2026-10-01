import "server-only"

import type { FuelType } from "./regions"

export function isGoogleMapsConfigured() {
  return !!process.env.GOOGLE_MAPS_API_KEY?.trim()
}

function apiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim()
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set")
  return key
}

export interface GeocodeResult {
  lat: number
  lng: number
  postalCode: string | null
}

/** Geocoding API (Essentials SKU). Returns null when the address can't be resolved. */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({ address, region: "us", key: apiKey() })
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`Geocoding request failed: ${res.status}`)
  const body = (await res.json()) as {
    status: string
    error_message?: string
    results?: Array<{ geometry: { location: { lat: number; lng: number } }; address_components?: Array<{ types: string[]; short_name: string }> }>
  }
  if (body.status === "ZERO_RESULTS") return null
  if (body.status !== "OK") throw new Error(`Geocoding error: ${body.status}${body.error_message ? ` — ${body.error_message}` : ""}`)
  const top = body.results?.[0]
  if (!top) return null
  const postal = top.address_components?.find((c) => c.types.includes("postal_code"))?.short_name ?? null
  return { lat: top.geometry.location.lat, lng: top.geometry.location.lng, postalCode: postal }
}

export interface StationPrice {
  placeId: string
  name: string
  address: string | null
  lat: number
  lng: number
  fuel: FuelType
  /** $/gal */
  price: number
  /** Google's updateTime for this price */
  observedAt: string | null
}

/** Google's fuel type enum → ours. Anything else (premium, E85, LPG…) is dropped. */
const FUEL_MAP: Record<string, FuelType> = {
  DIESEL: "diesel",
  TRUCK_DIESEL: "diesel",
  REGULAR_UNLEADED: "gasoline_regular",
}

/**
 * Places API (New) Nearby Search with the `fuelOptions` field — the
 * Enterprise + Atmosphere SKU (1,000 free calls/month, then ~$0.04 each).
 * One call per grid cell; returns one row per station per fuel we track.
 */
export async function fetchNearbyStationPrices(center: { lat: number; lng: number }, radiusMeters = 8000): Promise<StationPrice[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.fuelOptions",
    },
    body: JSON.stringify({
      includedTypes: ["gas_station"],
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationRestriction: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: radiusMeters } },
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Places request failed: ${res.status} ${text.slice(0, 300)}`)
  }
  const body = (await res.json()) as {
    places?: Array<{
      id: string
      displayName?: { text: string }
      formattedAddress?: string
      location?: { latitude: number; longitude: number }
      fuelOptions?: { fuelPrices?: Array<{ type: string; price?: { currencyCode?: string; units?: string | number; nanos?: number }; updateTime?: string }> }
    }>
  }

  const out: StationPrice[] = []
  for (const p of body.places ?? []) {
    if (!p.location) continue
    // Keep the freshest price per fuel when a station reports several (e.g. DIESEL and TRUCK_DIESEL).
    const best = new Map<FuelType, { price: number; observedAt: string | null }>()
    for (const fp of p.fuelOptions?.fuelPrices ?? []) {
      const fuel = FUEL_MAP[fp.type]
      if (!fuel || !fp.price) continue
      if (fp.price.currencyCode && fp.price.currencyCode !== "USD") continue
      const price = Number(fp.price.units ?? 0) + (fp.price.nanos ?? 0) / 1e9
      if (!Number.isFinite(price) || price <= 0) continue
      const prev = best.get(fuel)
      if (!prev || (fp.updateTime ?? "") > (prev.observedAt ?? "")) best.set(fuel, { price: Math.round(price * 1000) / 1000, observedAt: fp.updateTime ?? null })
    }
    for (const [fuel, v] of best) {
      out.push({ placeId: p.id, name: p.displayName?.text ?? "Gas station", address: p.formattedAddress ?? null, lat: p.location.latitude, lng: p.location.longitude, fuel, ...v })
    }
  }
  return out
}
