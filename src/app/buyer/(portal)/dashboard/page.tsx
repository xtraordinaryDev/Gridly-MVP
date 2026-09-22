import Link from "next/link"
import {
  AlertTriangle,
  Award,
  CalendarClock,
  ClipboardList,
  FilePlus,
  Hourglass,
  Leaf,
  Receipt,
  Search,
  Sprout,
  Send,
  Users,
} from "lucide-react"

import { requireBuyer } from "@/lib/auth"
import { getBuyerDashboardStats, getBuyerRfpActivity } from "@/lib/data/buyer"
import { getBuyerInvoiceStats } from "@/lib/data/invoices"
import { money, moneyCompact } from "@/lib/invoicing/types"
import { MonthlyBars, PriceVsAwarded, RankedBars, SingleBars, StatTile, TargetProgress } from "@/components/invoicing/charts"
import { getEmissionsStats } from "@/lib/data/emissions"
import { EMISSION_FACTOR_SOURCE, formatTons } from "@/lib/emissions/factors"
import { EmissionsTargetDialog } from "@/components/emissions/emissions-target-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

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
  published: ClipboardList,
  bid: Send,
  awarded: Award,
  closed: ClipboardList,
} as const

export default async function BuyerDashboardPage() {
  const { profile } = await requireBuyer()
  const [stats, activity, inv, em] = await Promise.all([
    getBuyerDashboardStats(),
    getBuyerRfpActivity(),
    getBuyerInvoiceStats(profile.id),
    getEmissionsStats({ role: "buyer", id: profile.id }),
  ])

  const kpis = [
    {
      label: "Active RFPs",
      value: stats.activeRfps,
      icon: ClipboardList,
      href: "/buyer/rfps",
      accent: "text-brand-blue bg-brand-blue/10",
    },
    {
      label: "Suppliers in network",
      value: stats.suppliersInNetwork,
      icon: Users,
      href: "/buyer/directory",
      accent: "text-emerald bg-emerald/15",
    },
    {
      label: "Bids received",
      value: stats.bidsReceived,
      icon: Send,
      href: "/buyer/rfps",
      accent: "text-navy bg-navy/10",
    },
    {
      label: "Awarded contracts",
      value: stats.awardedContracts,
      icon: Award,
      href: "/buyer/rfps",
      accent: "text-amber-600 bg-amber-100",
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Your procurement command center.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/buyer/rfps/new"
            className={cn(buttonVariants(), "gap-2")}
          >
            <FilePlus className="size-4" />
            Create RFP
          </Link>
          <Link
            href="/buyer/directory"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Search className="size-4" />
            Browse Directory
          </Link>
          <Link
            href="/buyer/orders/new?urgency=emergency"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800")}
          >
            <AlertTriangle className="size-4" />
            Emergency fuel
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${kpi.accent}`}
                >
                  <kpi.icon className="size-5" />
                </span>
                <p className="mt-4 text-3xl font-bold text-navy">{kpi.value}</p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">Payables</h2>
          <Link href="/buyer/invoices" className="text-sm font-medium text-brand-blue hover:underline">
            View invoices
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Outstanding" value={moneyCompact(inv.outstanding)} title={money(inv.outstanding)} icon={Hourglass} accent="text-brand-blue bg-brand-blue/10" href="/buyer/invoices" />
          <StatTile label="Due this week" value={moneyCompact(inv.dueThisWeek)} title={money(inv.dueThisWeek)} hint={`${inv.dueThisWeekCount}`} icon={CalendarClock} accent="text-amber-700 bg-amber-100" href="/buyer/invoices" />
          <StatTile label="Overdue" value={moneyCompact(inv.overdue)} title={money(inv.overdue)} hint={`${inv.overdueCount}`} icon={AlertTriangle} accent={inv.overdue > 0 ? "text-red-700 bg-red-100" : "text-muted-foreground bg-muted"} href="/buyer/invoices" />
          <StatTile label="Spend YTD" value={moneyCompact(inv.spendYtd)} title={money(inv.spendYtd)} icon={Receipt} accent="text-emerald bg-emerald/15" href="/buyer/invoices" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <MonthlyBars series={inv.monthly} title="Invoiced vs paid (6 months)" />
          <PriceVsAwarded rows={inv.priceVsAwarded} />
          <RankedBars title="Spend by supplier" items={inv.bySupplier} />
          <RankedBars title="Spend by fuel type" items={inv.byFuel} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy">Emissions</h2>
          <p className="text-sm text-muted-foreground">Scope 1 CO2e from fuel invoiced to you, {em.year} year to date.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="CO2e year to date" value={formatTons(em.tonsYtd)} hint={em.tonsPriorYtd != null ? `${formatTons(em.tonsPriorYtd)} last year` : `${em.gallonsYtd.toLocaleString("en-US")} gal`} icon={Leaf} accent="text-emerald bg-emerald/15" />
          <StatTile label="Carbon intensity" value={em.intensityKgPerGal == null ? "—" : `${em.intensityKgPerGal.toFixed(2)} kg/gal`} hint="diesel is 10.21" icon={Leaf} accent="text-navy bg-navy/10" />
          <StatTile label="Renewable share" value={`${em.renewableSharePct}%`} hint="of gallons" icon={Sprout} accent="text-emerald bg-emerald/15" />
          <StatTile label="Avoided vs diesel" value={formatTons(em.avoidedTonsYtd)} hint="from renewables" icon={Sprout} accent="text-brand-blue bg-brand-blue/10" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <TargetProgress label={`${em.year} target`} current={em.tonsYtd} target={em.target?.targetTons ?? null} unit="t CO2e" format={(v) => v.toLocaleString("en-US", { maximumFractionDigits: 0 })}>
            <EmissionsTargetDialog year={em.year} current={em.target?.targetTons ?? null} note={em.target?.note ?? null} tonsYtd={em.tonsYtd} />
          </TargetProgress>
          <SingleBars title="Emissions by month" unit="t CO2e" color="#10B981" series={em.monthly.map((m) => ({ label: m.label, value: m.tons }))} />
          <RankedBars title="Emissions by fuel type" items={em.byFuel} color="#10B981" empty="No fuel invoiced yet." />
          <RankedBars title="Emissions by supplier" items={em.byParty} color="#10B981" empty="No fuel invoiced yet." />
        </div>
        <p className="text-xs text-muted-foreground">Factors: {EMISSION_FACTOR_SOURCE}.</p>
      </section>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-navy">Recent RFP activity</h2>
          <ol className="mt-5 space-y-5">
            {activity.map((event, i) => {
              const Icon = ACTIVITY_ICON[event.type]
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
  )
}
