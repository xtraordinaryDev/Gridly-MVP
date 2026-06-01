import Link from "next/link"
import { Send } from "lucide-react"

import { getOpportunities } from "@/lib/data/vendor"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function VendorRfpResponsesPage() {
  const opportunities = await getOpportunities()
  const responded = opportunities.filter((o) => o.status === "responded")

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          RFP Responses
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bids you&apos;ve submitted and their status.
        </p>
      </div>

      {responded.length === 0 ? (
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
          {responded.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link
                    href={`/vendor/opportunities/${o.id}`}
                    className="truncate font-medium text-navy hover:underline"
                  >
                    {o.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {o.buyer} · {o.quantityGallons.toLocaleString()} gal · Due{" "}
                    {formatDate(o.dueDate)}
                  </p>
                </div>
                <Badge className="bg-emerald/15 text-emerald">Submitted</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
