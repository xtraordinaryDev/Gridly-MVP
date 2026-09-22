import Link from "next/link"
import { FilePlus } from "lucide-react"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
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

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function VendorContractsPage() {
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const contracts = await listContracts({ role: "vendor", id: vendorId })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Contracts</h1>
          <p className="mt-1 text-muted-foreground">RFPs you were awarded. Invoices are created against a contract.</p>
        </div>
        <Link href="/vendor/invoices/new" className={cn(buttonVariants(), "gap-2")}>
          <FilePlus className="size-4" />
          New invoice
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs uppercase tracking-wide">Contract</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Buyer</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Fuel</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Rate</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Terms</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Invoiced</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Paid</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Awarded</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No contracts yet. When a buyer awards you an RFP it will appear here.
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><Link href={`/vendor/contracts/${c.id}`} className="font-medium text-navy hover:underline">{c.title}</Link></TableCell>
                  <TableCell>{c.buyerName}</TableCell>
                  <TableCell className="text-muted-foreground">{c.fuelType}</TableCell>
                  <TableCell className="text-right tabular-nums">${c.pricePerGallon.toFixed(4)}/gal</TableCell>
                  <TableCell className="text-muted-foreground">Net {c.netDays}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(c.invoicedTotal)}<span className="ml-1 text-xs text-muted-foreground">({c.invoiceCount})</span></TableCell>
                  <TableCell className="text-right tabular-nums text-emerald">{money(c.paidTotal)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(c.awardedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/vendor/invoices/new?contract=${c.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      Invoice
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
