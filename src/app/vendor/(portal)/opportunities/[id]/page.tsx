import Link from "next/link"
import { notFound } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Droplet,
  MapPin,
} from "lucide-react"

import { requireVendor } from "@/lib/auth"
import {
  getVendorOpportunityDetail,
  markInvitationViewed,
  resolveVendorIdForSession,
} from "@/lib/data/rfps"
import { OpportunityStatusBadge } from "@/components/vendor/opportunity-status-badge"
import { VendorBidForm } from "@/components/vendor/vendor-bid-form"
import { VendorOpportunityActions } from "@/components/vendor/vendor-opportunity-actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)

  const o = await getVendorOpportunityDetail(vendorId, id)
  if (!o) notFound()

  if (o.status === "invited") {
    await markInvitationViewed(vendorId, id)
  }

  const canBid = o.status !== "declined" && o.status !== "responded" && !o.existingResponse
  const facts = [
    { label: "Fuel type", value: o.fuelType, icon: Droplet },
    { label: "Quantity", value: `${o.quantityGallons.toLocaleString()} gal`, icon: Droplet },
    { label: "States", value: o.deliveryStates.join(", "), icon: MapPin },
    { label: "Due date", value: formatDate(o.bidDueDate), icon: CalendarClock },
  ]

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/vendor/opportunities"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Back to opportunities
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{o.buyer}</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-navy">
            {o.urgency === "emergency" ? (
              <AlertTriangle className="size-5 text-destructive" />
            ) : null}
            {o.title}
          </h1>
        </div>
        <OpportunityStatusBadge status={o.status} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-sm leading-relaxed text-foreground">{o.description}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-navy">
                  <f.icon className="size-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {f.label}
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
          {o.requiredCapabilities.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {o.requiredCapabilities.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-6">
        {o.existingResponse ? (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-navy">Your submitted bid</h2>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Price / gal</dt>
                  <dd className="font-medium">
                    ${o.existingResponse.pricePerGallon.toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-medium">
                    ${o.existingResponse.totalPrice.toLocaleString()}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Terms</dt>
                  <dd>{o.existingResponse.deliveryTerms}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ) : canBid ? (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 font-semibold text-navy">Submit bid</h2>
              <VendorBidForm rfpId={id} quantityGallons={o.quantityGallons} />
              <VendorOpportunityActions rfpId={id} />
            </CardContent>
          </Card>
        ) : o.status === "declined" ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            You declined this opportunity.
          </p>
        ) : null}
      </div>
    </div>
  )
}
