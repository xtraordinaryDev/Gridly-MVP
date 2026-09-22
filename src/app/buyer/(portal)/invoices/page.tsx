import { AlertTriangle, CalendarClock, Hourglass, MessageSquareWarning } from "lucide-react"

import { requireBuyer } from "@/lib/auth"
import { getBuyerInvoiceStats, listInvoices } from "@/lib/data/invoices"
import { money, moneyCompact } from "@/lib/invoicing/types"
import { InvoicesTable } from "@/components/invoicing/invoices-table"
import { StatTile } from "@/components/invoicing/charts"

export default async function BuyerInvoicesPage() {
  const { profile } = await requireBuyer()
  const [invoices, stats] = await Promise.all([
    listInvoices({ role: "buyer", id: profile.id }),
    getBuyerInvoiceStats(profile.id),
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Invoices</h1>
        <p className="mt-1 text-muted-foreground">Supplier invoices against your awarded contracts.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Payables outstanding" value={moneyCompact(stats.outstanding)} title={money(stats.outstanding)} icon={Hourglass} accent="text-brand-blue bg-brand-blue/10" />
        <StatTile label="Due this week" value={moneyCompact(stats.dueThisWeek)} title={money(stats.dueThisWeek)} hint={`${stats.dueThisWeekCount} invoice${stats.dueThisWeekCount === 1 ? "" : "s"}`} icon={CalendarClock} accent="text-amber-700 bg-amber-100" />
        <StatTile label="Overdue" value={moneyCompact(stats.overdue)} title={money(stats.overdue)} hint={`${stats.overdueCount} invoice${stats.overdueCount === 1 ? "" : "s"}`} icon={AlertTriangle} accent={stats.overdue > 0 ? "text-red-700 bg-red-100" : "text-muted-foreground bg-muted"} />
        <StatTile label="Disputed" value={String(stats.disputedCount)} icon={MessageSquareWarning} accent="text-navy bg-navy/10" />
      </div>

      <InvoicesTable data={invoices} basePath="/buyer/invoices" party="vendor" hideDrafts />
    </div>
  )
}
