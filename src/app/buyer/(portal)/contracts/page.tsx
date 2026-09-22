import Link from "next/link"
import { Truck } from "lucide-react"

import { requireBuyer } from "@/lib/auth"
import { listContracts } from "@/lib/data/invoices"
import { money } from "@/lib/invoicing/types"
import { buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

function fmt(v: string) {
  return new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function BuyerContractsPage() {
  const { profile } = await requireBuyer()
  const contracts = await listContracts({ role: "buyer", id: profile.id })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Contracts</h1>
          <p className="mt-1 text-muted-foreground">Awarded RFPs. Place orders, track deliveries, and review invoices per contract.</p>
        </div>
        <Link href="/buyer/orders/new" className={cn(buttonVariants(), "gap-2")}>
          <Truck className="size-4" />
          Place order
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs uppercase tracking-wide">Contract</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Supplier</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Fuel</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Pricing</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Invoiced</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Paid</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Awarded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No contracts yet. Award an RFP to create one.</TableCell></TableRow>
            ) : contracts.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Link href={`/buyer/contracts/${c.id}`} className="font-medium text-navy hover:underline">{c.title}</Link></TableCell>
                <TableCell>{c.vendorName}</TableCell>
                <TableCell className="text-muted-foreground">{c.fuelType}</TableCell>
                <TableCell className="text-muted-foreground">{c.pricingMode === "index" ? `${c.indexName ?? "Index"} ${c.differential != null ? (c.differential >= 0 ? "+" : "−") + " $" + Math.abs(c.differential).toFixed(4) : ""}` : `$${c.pricePerGallon.toFixed(4)}/gal`}</TableCell>
                <TableCell className="text-right tabular-nums">{money(c.invoicedTotal)}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald">{money(c.paidTotal)}</TableCell>
                <TableCell className="text-muted-foreground">{fmt(c.awardedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
