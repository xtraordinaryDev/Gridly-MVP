"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import type { InvoiceListItem, InvoiceStatus } from "@/lib/invoicing/types"
import { money } from "@/lib/invoicing/types"
import { InvoiceStatusBadge } from "@/components/invoicing/invoice-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Filter = "all" | "open" | "overdue" | "draft" | "disputed" | "paid"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "disputed", label: "Disputed" },
  { value: "draft", label: "Drafts" },
  { value: "paid", label: "Paid" },
]

const OPEN: InvoiceStatus[] = ["sent", "viewed", "disputed", "partially_paid"]

function formatDate(value: string) {
  return new Date(value + "T12:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function InvoicesTable({
  data,
  basePath,
  party,
  hideDrafts = false,
  compact = false,
}: {
  data: InvoiceListItem[]
  basePath: string
  /** which counterparty column to show */
  party: "buyer" | "vendor"
  hideDrafts?: boolean
  compact?: boolean
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("all")

  const rows = useMemo(() => {
    const base = hideDrafts ? data.filter((i) => i.status !== "draft") : data
    switch (filter) {
      case "open":
        return base.filter((i) => OPEN.includes(i.status))
      case "overdue":
        return base.filter((i) => i.isOverdue)
      case "disputed":
        return base.filter((i) => i.status === "disputed")
      case "draft":
        return base.filter((i) => i.status === "draft")
      case "paid":
        return base.filter((i) => i.status === "paid")
      default:
        return base
    }
  }, [data, filter, hideDrafts])

  const filters = hideDrafts ? FILTERS.filter((f) => f.value !== "draft") : FILTERS

  return (
    <div className="space-y-3">
      {!compact ? (
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.value
                  ? "bg-navy text-navy-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs uppercase tracking-wide">Invoice</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">
                {party === "buyer" ? "Buyer" : "Supplier"}
              </TableHead>
              {!compact ? <TableHead className="text-xs uppercase tracking-wide">Contract</TableHead> : null}
              <TableHead className="text-xs uppercase tracking-wide">Issued</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Due</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Total</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Balance</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={compact ? 7 : 8} className="h-24 text-center text-muted-foreground">
                  No invoices to show.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`${basePath}/${inv.id}`)}
                >
                  <TableCell className="font-medium text-navy">{inv.number}</TableCell>
                  <TableCell>{party === "buyer" ? inv.buyerName : inv.vendorName}</TableCell>
                  {!compact ? (
                    <TableCell className="max-w-[260px] truncate text-muted-foreground">{inv.contractTitle}</TableCell>
                  ) : null}
                  <TableCell className="text-muted-foreground">{formatDate(inv.issueDate)}</TableCell>
                  <TableCell className={cn(inv.isOverdue && "font-medium text-red-700")}>
                    {formatDate(inv.dueDate)}
                    {inv.isOverdue ? (
                      <span className="ml-1 text-xs text-red-700">({inv.daysOverdue}d)</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(inv.total)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {inv.status === "draft" || inv.status === "void" ? "—" : money(inv.balance)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={inv.status} overdue={inv.isOverdue} />
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
