"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ChevronRight } from "lucide-react"

import type { VendorOpportunityListItem } from "@/lib/rfp/types"
import type { InvitationStatus } from "@/lib/rfp/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OpportunityStatusBadge } from "./opportunity-status-badge"
import { cn } from "@/lib/utils"

const FILTERS: { value: InvitationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "invited", label: "New" },
  { value: "viewed", label: "Viewed" },
  { value: "responded", label: "Responded" },
  { value: "declined", label: "Declined" },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function StatesCell({ states }: { states: string[] }) {
  if (!states.length) return <span className="text-muted-foreground">—</span>
  const shown = states.slice(0, 2).join(", ")
  return (
    <span className="whitespace-nowrap">
      {shown}
      {states.length > 2 ? ` +${states.length - 2}` : ""}
    </span>
  )
}

export function OpportunitiesTable({
  opportunities,
}: {
  opportunities: VendorOpportunityListItem[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<InvitationStatus | "all">("all")

  const filtered = useMemo(() => {
    if (filter === "all") return opportunities
    return opportunities.filter((o) => o.status === filter)
  }, [opportunities, filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === f.value
                ? "bg-navy text-navy-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs uppercase tracking-wide">Buyer</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">RFP Title</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Fuel Type</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Quantity</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">States</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Due</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No opportunities match this filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow
                  key={o.id}
                  onClick={() => router.push(`/vendor/opportunities/${o.id}`)}
                  className="group cursor-pointer"
                >
                  <TableCell className="whitespace-nowrap font-medium text-navy">
                    {o.buyer}
                  </TableCell>
                  <TableCell className="max-w-[18rem]">
                    <span className="flex items-center gap-1.5">
                      {o.urgency === "emergency" ? (
                        <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                      ) : null}
                      <span className="truncate">{o.title}</span>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {o.fuelType}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {o.quantityGallons.toLocaleString()} gal
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <StatesCell states={o.states} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(o.dueDate)}
                  </TableCell>
                  <TableCell>
                    <OpportunityStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
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
