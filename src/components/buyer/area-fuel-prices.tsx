import Link from "next/link"
import { format } from "date-fns"
import { Fuel, MapPin, Minus, TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FUEL_TYPE_LABEL, type AreaFuelPriceSummary, type FuelPricePoint, type FuelType, type SiteStations } from "@/lib/fuel-prices"

const ORDER: FuelType[] = ["diesel", "gasoline_regular"]

function perGal(v: number) {
  return `$${v.toFixed(3)}`
}

function Delta({ point }: { point: FuelPricePoint }) {
  if (point.prior == null) return null
  const d = Math.round((point.price - point.prior) * 1000) / 1000
  const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus
  const tone = d > 0 ? "text-red-700 bg-red-50" : d < 0 ? "text-emerald bg-emerald/10" : "text-muted-foreground bg-muted"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums", tone)} title="vs. prior week">
      <Icon className="size-3" />
      {d === 0 ? "flat" : `${d > 0 ? "+" : "−"}$${Math.abs(d).toFixed(3)}`}
    </span>
  )
}

function PricePoint({ fuel, point }: { fuel: FuelType; point: FuelPricePoint }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{FUEL_TYPE_LABEL[fuel]}</p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums text-navy">{perGal(point.price)}</span>
        <span className="text-xs text-muted-foreground">/gal</span>
        <Delta point={point} />
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
        {point.areaLabel} · week of {format(new Date(point.asOf + "T12:00:00Z"), "MMM d")}
      </p>
    </div>
  )
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6 text-sm text-muted-foreground">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-navy">
          <Fuel className="size-5" />
        </span>
        {children}
      </CardContent>
    </Card>
  )
}

function SiteStationsCard({ site }: { site: SiteStations }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <MapPin className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">{site.siteName}</p>
            <p className="text-xs text-muted-foreground">Nearest stations with posted prices</p>
          </div>
        </div>
        {site.stations.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No stations with posted prices within 10 miles yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-1 text-left font-medium">Station</th>
                <th className="pb-1 text-right font-medium">Diesel</th>
                <th className="pb-1 text-right font-medium">Regular</th>
              </tr>
            </thead>
            <tbody>
              {site.stations.map((st) => (
                <tr key={st.placeId} className="border-t">
                  <td className="py-2 pr-2">
                    <p className="truncate font-medium text-foreground" title={st.address ?? undefined}>{st.name}</p>
                    <p className="text-xs text-muted-foreground">{st.distanceMiles.toFixed(1)} mi</p>
                  </td>
                  <td className="py-2 text-right tabular-nums text-navy">{st.prices.diesel ? perGal(st.prices.diesel.price) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-2 text-right tabular-nums text-navy">{st.prices.gasoline_regular ? perGal(st.prices.gasoline_regular.price) : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AreaFuelPrices({ data }: { data: AreaFuelPriceSummary }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-navy">Fuel prices near your sites</h2>
          <p className="text-sm text-muted-foreground">Weekly retail averages for your areas, and posted prices at the stations closest to each site.</p>
        </div>
        <Link href="/buyer/settings" className="text-sm font-medium text-brand-blue hover:underline">
          Manage sites
        </Link>
      </div>

      {data.status !== "ok" || data.areas.length === 0 ? (
        <EmptyCard>
          {data.status === "unconfigured"
            ? "Area price benchmarks aren't configured for this environment yet."
            : data.status === "empty"
              ? "Area price benchmarks will appear after the next daily refresh."
              : "Add a delivery site with a state to see prices for your area."}
        </EmptyCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.areas.map((area) => (
            <Card key={area.key}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                    <Fuel className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{area.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {area.siteCount === 0 ? "No sites saved yet" : `${area.siteCount} site${area.siteCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {ORDER.map((fuel) => {
                    const p = area.prices[fuel]
                    return p ? <PricePoint key={fuel} fuel={fuel} point={p} /> : null
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data.stationsStatus === "unconfigured" ? null : data.stationsStatus === "pending" || data.stations.length === 0 ? (
        <EmptyCard>Station prices near your sites will appear after the next daily refresh.</EmptyCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.stations.map((site) => (
            <SiteStationsCard key={site.siteId} site={site} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Area averages: U.S. Energy Information Administration, Gasoline and Diesel Fuel Update.
        {data.stationsStatus !== "unconfigured" ? " Station prices: Google, as posted by stations and drivers; refreshed daily." : ""}
        {" "}Retail pump prices — bulk delivered pricing is typically lower.
      </p>
    </section>
  )
}
