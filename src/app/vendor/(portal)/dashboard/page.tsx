import Link from "next/link"
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  Gauge,
  Hourglass,
  Leaf,
  Send,
  Sprout,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react"

import { requireVendor } from "@/lib/auth"
import {
  listVendorOpportunities,
  resolveVendorIdForSession,
} from "@/lib/data/rfps"
import {
  getCurrentVendor,
  getDashboardStats,
  getOpportunities,
  getVendorActivity,
} from "@/lib/data/vendor"
import { getVendorInvoiceStats } from "@/lib/data/invoices"
import { money, moneyCompact } from "@/lib/invoicing/types"
import { AgingBar, MonthlyBars, RankedBars, SingleBars, StatTile } from "@/components/invoicing/charts"
import { getEmissionsStats } from "@/lib/data/emissions"
import { listVendorDocuments, DOCUMENT_TYPES } from "@/lib/data/documents"
import { getVendorPerformance } from "@/lib/data/ratings"
import { listOrders } from "@/lib/data/orders"
import { Stars } from "@/components/orders/rating-card"
import { EMISSION_FACTOR_SOURCE, formatTons } from "@/lib/emissions/factors"
import { Card, CardContent } from "@/components/ui/card"
import { OpportunitiesTable } from "@/components/vendor/opportunities-table"

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function relative(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

const ACTIVITY_ICON = {
  verified: BadgeCheck,
  invited: Truck,
  submitted: Send,
  viewed: Eye,
} as const

export default async function VendorDashboardPage() {
  const { profile, preview } = await requireVendor()
  const vendor = await getCurrentVendor()
  if (!vendor) return null

  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const [opportunities, oppList, activity, inv, em, docs, perf, orders] = await Promise.all([
    getOpportunities(),
    listVendorOpportunities(vendorId),
    getVendorActivity(),
    getVendorInvoiceStats(vendorId),
    getEmissionsStats({ role: "vendor", id: vendorId }),
    listVendorDocuments(vendorId),
    getVendorPerformance(vendorId),
    listOrders(vendorId ? { role: "vendor", id: vendorId } : { role: "vendor", id: "" }),
  ])
  const docIssues = DOCUMENT_TYPES.filter((t) => t.required && !docs.some((d) => d.type === t.type)).map((t) => `${t.label} missing`)
    .concat(docs.filter((d) => d.isExpired).map((d) => `${DOCUMENT_TYPES.find((t) => t.type === d.type)?.label ?? d.type} expired`))
    .concat(docs.filter((d) => d.expiresSoon).map((d) => `${DOCUMENT_TYPES.find((t) => t.type === d.type)?.label ?? d.type} expires soon`))
  const openOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status))
  const emergencies = openOrders.filter((o) => o.urgency === "emergency")
  const stats = getDashboardStats(vendor, opportunities)

  const kpis = [
    { label: "New opportunities this week", value: stats.newOpportunitiesThisWeek, icon: Sparkles, accent: "text-brand-blue bg-brand-blue/10" },
    { label: "Active RFPs invited to", value: stats.activeRfpInvites, icon: Truck, accent: "text-navy bg-navy/10" },
    { label: "Bids submitted YTD", value: stats.bidsSubmittedYtd, icon: Send, accent: "text-emerald bg-emerald/15" },
    { label: "Profile completeness", value: `${stats.profileCompleteness}%`, icon: Gauge, accent: "text-amber-600 bg-amber-100" },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Verified hero strip */}
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-navy to-navy/85 text-navy-foreground shadow-sm">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald/20 ring-1 ring-emerald/40">
              <ShieldCheck className="size-8 text-emerald" />
            </span>
            <div>
              <p className="flex items-center gap-2 text-lg font-bold">
                GridLink Verified
              </p>
              <p className="text-sm text-white/70">
                {vendor.companyName}
                {vendor.verifiedAt
                  ? ` · Verified ${formatDate(vendor.verifiedAt)}`
                  : ""}
              </p>
            </div>
          </div>
          <Link
            href="/vendor/profile?preview=1"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <Eye className="size-4" />
            View public profile
          </Link>
        </div>
      </div>

      {docIssues.length ? (
        <Link href="/vendor/documents" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 hover:bg-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span><strong>Compliance:</strong> {docIssues.join(" · ")}. Upload current copies to keep your verified status.</span>
        </Link>
      ) : null}
      {emergencies.length ? (
        <Link href="/vendor/orders" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 hover:bg-red-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span><strong>{emergencies.length} emergency order{emergencies.length === 1 ? "" : "s"}</strong> waiting for confirmation.</span>
        </Link>
      ) : null}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <span className={`flex size-10 items-center justify-center rounded-xl ${kpi.accent}`}>
                <kpi.icon className="size-5" />
              </span>
              <p className="mt-4 text-3xl font-bold text-navy">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance + fulfilment */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Buyer rating</p><div className="mt-2 flex items-center gap-2">{perf.avgStars != null ? <><Stars value={perf.avgStars} size="size-5" /><span className="text-2xl font-bold text-navy">{perf.avgStars.toFixed(1)}</span></> : <span className="text-2xl font-bold text-navy">—</span>}</div><p className="text-xs text-muted-foreground">{perf.ratingCount} rating{perf.ratingCount === 1 ? "" : "s"}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">On-time deliveries</p><p className="mt-2 text-2xl font-bold text-navy">{perf.onTimePct == null ? "—" : `${perf.onTimePct}%`}</p><p className="text-xs text-muted-foreground">{perf.deliveriesCount} logged</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Open orders</p><p className="mt-2 text-2xl font-bold text-navy">{openOrders.length}</p><Link href="/vendor/orders" className="text-xs text-brand-blue hover:underline">Confirm &amp; schedule</Link></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Contracts won</p><p className="mt-2 text-2xl font-bold text-navy">{perf.awardsCount}</p><p className="text-xs text-muted-foreground">{perf.activeContracts} active</p></CardContent></Card>
      </div>

      {/* Receivables */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">Receivables</h2>
          <Link href="/vendor/invoices" className="text-sm font-medium text-brand-blue hover:underline">
            View invoices
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Outstanding" value={moneyCompact(inv.outstanding)} title={money(inv.outstanding)} hint={`${inv.openCount} open`} icon={Hourglass} accent="text-brand-blue bg-brand-blue/10" href="/vendor/invoices" />
          <StatTile label="Overdue" value={moneyCompact(inv.overdue)} title={money(inv.overdue)} hint={`${inv.overdueCount}`} icon={AlertTriangle} accent={inv.overdue > 0 ? "text-red-700 bg-red-100" : "text-muted-foreground bg-muted"} href="/vendor/invoices" />
          <StatTile label="Paid YTD" value={moneyCompact(inv.paidYtd)} title={money(inv.paidYtd)} hint={`${money(inv.paidThisMonth)} this month`} icon={CircleDollarSign} accent="text-emerald bg-emerald/15" href="/vendor/invoices" />
          <StatTile label="Avg days to pay" value={inv.avgDaysToPay == null ? "—" : `${inv.avgDaysToPay}d`} icon={TrendingUp} accent="text-navy bg-navy/10" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <MonthlyBars series={inv.monthly} title="Invoiced vs collected (6 months)" labels={{ invoiced: "Invoiced", paid: "Collected" }} />
          <AgingBar buckets={inv.aging} />
          <RankedBars title="Revenue by buyer" items={inv.byBuyer} />
        </div>
      </section>

      {/* Emissions delivered */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy">Emissions delivered</h2>
          <p className="text-sm text-muted-foreground">Scope 1 CO2e your customers report from fuel you invoiced, {em.year} year to date.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="CO2e delivered YTD" value={formatTons(em.tonsYtd)} hint={`${em.gallonsYtd.toLocaleString("en-US")} gal`} icon={Leaf} accent="text-emerald bg-emerald/15" />
          <StatTile label="Carbon intensity" value={em.intensityKgPerGal == null ? "—" : `${em.intensityKgPerGal.toFixed(2)} kg/gal`} icon={Leaf} accent="text-navy bg-navy/10" />
          <StatTile label="Renewable share" value={`${em.renewableSharePct}%`} hint="of gallons delivered" icon={Sprout} accent="text-emerald bg-emerald/15" />
          <StatTile label="Avoided for customers" value={formatTons(em.avoidedTonsYtd)} hint="vs conventional diesel" icon={Sprout} accent="text-brand-blue bg-brand-blue/10" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SingleBars title="Emissions delivered by month" unit="t CO2e" color="#10B981" series={em.monthly.map((m) => ({ label: m.label, value: m.tons }))} />
          <RankedBars title="Emissions by buyer" items={em.byParty} color="#10B981" empty="No fuel invoiced yet." />
        </div>
        <p className="text-xs text-muted-foreground">Factors: {EMISSION_FACTOR_SOURCE}.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent opportunities */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy">
              Recent opportunities
            </h2>
            <Link
              href="/vendor/opportunities"
              className="text-sm font-medium text-brand-blue hover:underline"
            >
              View all
            </Link>
          </div>
          <OpportunitiesTable opportunities={oppList.slice(0, 5)} />
        </div>

        {/* Activity feed */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-navy">Activity</h2>
          <Card>
            <CardContent className="p-5">
              <ol className="space-y-5">
                {activity.map((event, i) => {
                  const Icon = ACTIVITY_ICON[event.type] ?? CheckCircle2
                  return (
                    <li key={event.id} className="relative flex gap-3">
                      {i < activity.length - 1 ? (
                        <span className="absolute left-[15px] top-9 h-[calc(100%-4px)] w-px bg-border" />
                      ) : null}
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-navy">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm leading-snug text-foreground">
                          {event.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {relative(event.date)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
