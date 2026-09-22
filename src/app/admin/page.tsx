import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Clock,
  FileStack,
  Hourglass,
  Leaf,
  Receipt,
  Sprout,
  ShieldCheck,
  Truck,
  UserPlus,
} from "lucide-react"

import { getDashboardStats, listApplications } from "@/lib/data/applications"
import { countPendingBuyerApplications } from "@/lib/data/buyer-applications"
import { getAdminInvoiceStats } from "@/lib/data/invoices"
import { money, moneyCompact } from "@/lib/invoicing/types"
import { RankedBars, StatTile } from "@/components/invoicing/charts"
import { getEmissionsStats } from "@/lib/data/emissions"
import { formatTons } from "@/lib/emissions/factors"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, SourceBadge } from "@/components/admin/status-badge"

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function AdminDashboardPage() {
  const [stats, applications, pendingBuyers, inv, em] = await Promise.all([
    getDashboardStats(),
    listApplications(),
    countPendingBuyerApplications(),
    getAdminInvoiceStats(),
    getEmissionsStats({ role: "admin", id: "admin" }),
  ])

  const recent = applications.slice(0, 5)

  const kpis = [
    {
      label: "Pending applications",
      value: stats.pendingApplications,
      icon: Clock,
      href: "/admin/applications?status=pending_review",
      accent: "text-amber-600 bg-amber-100",
    },
    {
      label: "Verified vendors",
      value: stats.verifiedVendors,
      icon: ShieldCheck,
      href: "/admin/vendors",
      accent: "text-emerald bg-emerald/15",
    },
    {
      label: "Active RFPs",
      value: stats.activeRfps,
      icon: Truck,
      href: "/admin/rfps",
      accent: "text-brand-blue bg-brand-blue/10",
    },
    {
      label: "Buyer requests",
      value: pendingBuyers,
      icon: UserPlus,
      href: "/admin/buyers?status=pending_review",
      accent: "text-amber-600 bg-amber-100",
    },
    {
      label: "Buyer organizations",
      value: stats.buyerOrganizations,
      icon: Building2,
      href: "/admin/buyers",
      accent: "text-navy bg-navy/10",
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Platform overview and review queue.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="group">
            <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl ${kpi.accent}`}
                  >
                    <kpi.icon className="size-5" />
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-4 text-3xl font-bold text-navy">{kpi.value}</p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-navy">Invoicing across the network</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Invoiced" value={moneyCompact(inv.invoicedTotal)} title={money(inv.invoicedTotal)} hint={`${inv.invoiceCount} invoices`} icon={Receipt} accent="text-brand-blue bg-brand-blue/10" />
          <StatTile label="Collected" value={moneyCompact(inv.paidTotal)} title={money(inv.paidTotal)} icon={CircleDollarSign} accent="text-emerald bg-emerald/15" />
          <StatTile label="Outstanding" value={moneyCompact(inv.outstanding)} title={money(inv.outstanding)} icon={Hourglass} accent="text-navy bg-navy/10" />
          <StatTile label="Overdue" value={moneyCompact(inv.overdue)} title={money(inv.overdue)} icon={AlertTriangle} accent={inv.overdue > 0 ? "text-red-700 bg-red-100" : "text-muted-foreground bg-muted"} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <RankedBars title="Top suppliers by invoiced" items={inv.topVendors} />
          <RankedBars title="Top buyers by spend" items={inv.topBuyers} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-navy">Emissions across the network ({em.year} YTD)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="CO2e from fuel invoiced" value={formatTons(em.tonsYtd)} hint={`${em.gallonsYtd.toLocaleString("en-US")} gal`} icon={Leaf} accent="text-emerald bg-emerald/15" />
          <StatTile label="Carbon intensity" value={em.intensityKgPerGal == null ? "—" : `${em.intensityKgPerGal.toFixed(2)} kg/gal`} icon={Leaf} accent="text-navy bg-navy/10" />
          <StatTile label="Renewable share" value={`${em.renewableSharePct}%`} icon={Sprout} accent="text-emerald bg-emerald/15" />
          <StatTile label="Avoided vs diesel" value={formatTons(em.avoidedTonsYtd)} icon={Sprout} accent="text-brand-blue bg-brand-blue/10" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <RankedBars title="Emissions by fuel type" items={em.byFuel} color="#10B981" />
          <RankedBars title="Emissions by buyer" items={em.byParty} color="#10B981" />
        </div>
      </section>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <FileStack className="size-4 text-muted-foreground" />
              <h2 className="font-semibold text-navy">Recent applications</h2>
            </div>
            <Link
              href="/admin/applications"
              className="text-sm font-medium text-brand-blue hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recent.map((app) => (
              <Link
                key={app.id}
                href={`/admin/applications/${app.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy">
                    {app.companyName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(app.submittedAt)} · {app.states.length} states ·{" "}
                    {app.products.length} products
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SourceBadge source={app.source} />
                  <StatusBadge status={app.status} />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
