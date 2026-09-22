import Link from "next/link"
import { AlertTriangle, CircleDollarSign, FilePlus, Hourglass, TrendingUp } from "lucide-react"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { getVendorInvoiceStats, listInvoices } from "@/lib/data/invoices"
import { money, moneyCompact } from "@/lib/invoicing/types"
import { InvoicesTable } from "@/components/invoicing/invoices-table"
import { StatTile } from "@/components/invoicing/charts"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function VendorInvoicesPage() {
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const [invoices, stats] = await Promise.all([
    listInvoices({ role: "vendor", id: vendorId }),
    getVendorInvoiceStats(vendorId),
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Invoices</h1>
          <p className="mt-1 text-muted-foreground">Bill buyers against awarded contracts and track what&apos;s been paid.</p>
        </div>
        <Link href="/vendor/invoices/new" className={cn(buttonVariants(), "gap-2")}>
          <FilePlus className="size-4" />
          New invoice
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Outstanding" value={moneyCompact(stats.outstanding)} title={money(stats.outstanding)} hint={`${stats.openCount} open`} icon={Hourglass} accent="text-brand-blue bg-brand-blue/10" />
        <StatTile label="Overdue" value={moneyCompact(stats.overdue)} title={money(stats.overdue)} hint={`${stats.overdueCount} invoice${stats.overdueCount === 1 ? "" : "s"}`} icon={AlertTriangle} accent={stats.overdue > 0 ? "text-red-700 bg-red-100" : "text-muted-foreground bg-muted"} />
        <StatTile label="Paid this month" value={moneyCompact(stats.paidThisMonth)} title={money(stats.paidThisMonth)} icon={CircleDollarSign} accent="text-emerald bg-emerald/15" />
        <StatTile label="Avg days to pay" value={stats.avgDaysToPay == null ? "—" : `${stats.avgDaysToPay}d`} icon={TrendingUp} accent="text-navy bg-navy/10" />
      </div>

      <InvoicesTable data={invoices} basePath="/vendor/invoices" party="buyer" />
    </div>
  )
}
