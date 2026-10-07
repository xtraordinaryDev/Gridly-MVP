import Link from "next/link"
import { Send } from "lucide-react"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { listVendorBids, type BidOutcome } from "@/lib/data/vendor"
import { money } from "@/lib/invoicing/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatRfpDate } from "@/lib/rfp/dates"
import { cn } from "@/lib/utils"

const OUTCOME: Record<BidOutcome, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-brand-blue/10 text-brand-blue" },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-muted-foreground" },
  awarded: { label: "Awarded", className: "bg-emerald/15 text-emerald" },
  not_selected: { label: "Not selected", className: "bg-amber-100 text-amber-800" },
  rfp_cancelled: { label: "RFP cancelled", className: "bg-muted text-muted-foreground" },
}

export default async function VendorRfpResponsesPage() {
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const bids = await listVendorBids(vendorId)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          RFP Responses
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bids you&apos;ve submitted and what became of them.
        </p>
      </div>

      {bids.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Send className="size-5" />
          </span>
          <p className="font-medium text-navy">No responses yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When you submit a bid, it will appear here.
          </p>
          <Link
            href="/vendor/opportunities"
            className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline"
          >
            Browse opportunities
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map((b) => {
            const outcome = OUTCOME[b.outcome]
            return (
              <Card key={b.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/vendor/opportunities/${b.rfpId}`}
                      className="block truncate font-medium text-navy hover:underline"
                    >
                      {b.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {b.buyer} · {b.quantityGallons.toLocaleString()} gal · Due {formatRfpDate(b.dueDate)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {b.outcome === "withdrawn" ? "Bid placed" : "Submitted"} {formatRfpDate(b.submittedAt)}
                      {b.outcome === "submitted" ? (b.biddingOpen ? " · you can still edit or withdraw" : " · awaiting the buyer's decision") : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <div className={cn("text-left sm:text-right", b.outcome === "withdrawn" && "text-muted-foreground line-through")}>
                      <p className="text-sm font-semibold tabular-nums text-navy">
                        {b.pricePerGallon != null ? `${b.pricingMode === "index" ? "≈ " : ""}$${b.pricePerGallon.toFixed(4)}/gal` : "—"}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {b.totalPrice != null ? `${money(b.totalPrice)} total` : ""}
                      </p>
                    </div>
                    <Badge className={outcome.className}>{outcome.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
