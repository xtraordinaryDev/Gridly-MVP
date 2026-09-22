import Link from "next/link"
import { CheckCircle2, Clock } from "lucide-react"

import type { DeliveryView } from "@/lib/data/orders"
import type { PartyRole } from "@/lib/invoicing/types"
import { AttachmentList } from "@/components/attachments"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function fmt(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function DeliveriesTable({ deliveries, role, showContract = true }: { deliveries: DeliveryView[]; role: PartyRole; showContract?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs uppercase tracking-wide">Delivered</TableHead>
            {showContract ? <TableHead className="text-xs uppercase tracking-wide">Contract</TableHead> : null}
            <TableHead className="text-xs uppercase tracking-wide">Site</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-wide">Gallons</TableHead>
            <TableHead className="text-xs uppercase tracking-wide">Ticket</TableHead>
            <TableHead className="text-xs uppercase tracking-wide">On time</TableHead>
            <TableHead className="text-xs uppercase tracking-wide">BOL</TableHead>
            <TableHead className="text-xs uppercase tracking-wide">Invoice</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showContract ? 8 : 7} className="h-24 text-center text-muted-foreground">No deliveries logged yet.</TableCell>
            </TableRow>
          ) : (
            deliveries.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="whitespace-nowrap">{fmt(d.deliveredAt)}</TableCell>
                {showContract ? <TableCell className="max-w-[220px] truncate text-navy">{d.contractTitle}</TableCell> : null}
                <TableCell className="max-w-[240px] truncate text-muted-foreground" title={d.siteAddress}>{d.siteAddress}</TableCell>
                <TableCell className="text-right tabular-nums">{d.gallons.toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">{d.ticketNumber ?? "—"}</TableCell>
                <TableCell>
                  {d.onTime == null ? <span className="text-muted-foreground">—</span> : d.onTime ? (
                    <span className="inline-flex items-center gap-1 text-emerald"><CheckCircle2 className="size-3.5" />Yes</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-700"><Clock className="size-3.5" />Late</span>
                  )}
                </TableCell>
                <TableCell>{d.bolPath ? <AttachmentList attachments={[{ name: "BOL", path: d.bolPath }]} bucket="delivery-docs" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  {d.invoiceId ? (
                    <Link href={`/${role === "buyer" ? "buyer" : "vendor"}/invoices/${d.invoiceId}`} className="text-brand-blue hover:underline">Invoiced</Link>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Unbilled</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
