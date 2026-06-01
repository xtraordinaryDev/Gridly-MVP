"use client"

import Link from "next/link"
import { format } from "date-fns"

import type { BuyerRfpDetail } from "@/lib/rfp/types"
import { RfpStatusBadge } from "@/components/buyer/rfp-status-badge"
import { RfpComparisonTable } from "@/components/buyer/rfp-comparison-table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatDt(iso: string | null) {
  if (!iso) return "—"
  return format(new Date(iso), "MMM d, yyyy")
}

const INVITE_STATUS: Record<string, string> = {
  invited: "bg-muted text-muted-foreground",
  viewed: "bg-amber-100 text-amber-800",
  responded: "bg-emerald/15 text-emerald",
  declined: "bg-destructive/10 text-destructive",
}

export function RfpDetailView({ rfp }: { rfp: BuyerRfpDetail }) {
  const canAward = rfp.status === "published"

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-navy">{rfp.title}</h1>
              <RfpStatusBadge status={rfp.status} />
              {rfp.urgency === "emergency" ? (
                <Badge variant="destructive">Emergency</Badge>
              ) : rfp.urgency === "rush" ? (
                <Badge className="bg-amber-100 text-amber-800">Rush</Badge>
              ) : null}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{rfp.description}</p>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Fuel / Qty</dt>
              <dd className="font-medium">
                {rfp.fuelType} · {rfp.quantityGallons.toLocaleString()} gal
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Bid due</dt>
              <dd className="font-medium">{formatDt(rfp.bidDueDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Invited / Responses</dt>
              <dd className="font-medium">
                {rfp.invitations.length} / {rfp.responses.length}
              </dd>
            </div>
            {rfp.awardedVendorName ? (
              <div>
                <dt className="text-xs text-muted-foreground">Awarded to</dt>
                <dd className="font-medium text-emerald">{rfp.awardedVendorName}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start border-b bg-transparent p-0">
          {["overview", "invited", "responses", "activity"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent px-4 py-3 capitalize data-active:border-brand-blue data-active:bg-transparent"
            >
              {tab === "invited" ? "Invited Suppliers" : tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Recurrence</dt>
              <dd className="font-medium capitalize">{rfp.recurrence.replace("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">States</dt>
              <dd className="font-medium">{rfp.deliveryStates.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Decision date</dt>
              <dd className="font-medium">{formatDt(rfp.decisionDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Expected award</dt>
              <dd className="font-medium">{formatDt(rfp.expectedAwardDate)}</dd>
            </div>
          </dl>
          <div>
            <h3 className="text-sm font-semibold text-navy">Delivery addresses</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
              {rfp.deliveryAddresses.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          {rfp.requiredCapabilities.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-navy">Required capabilities</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rfp.requiredCapabilities.map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {rfp.insuranceRequirements ? (
            <div>
              <h3 className="text-sm font-semibold text-navy">Insurance</h3>
              <p className="mt-1 text-sm text-muted-foreground">{rfp.insuranceRequirements}</p>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="invited" className="mt-6">
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Viewed</TableHead>
                  <TableHead>Responded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfp.invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link
                        href={`/buyer/directory/${inv.vendorId}`}
                        className="font-medium text-brand-blue hover:underline"
                      >
                        {inv.companyName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={INVITE_STATUS[inv.status]}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDt(inv.invitedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDt(inv.viewedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDt(inv.respondedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="responses" className="mt-6">
          <RfpComparisonTable rfp={rfp} canAward={canAward} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ul className="space-y-4">
            {rfp.activity.map((e) => (
              <li key={e.id} className="flex gap-3 border-l-2 border-brand-blue/30 pl-4">
                <div>
                  <p className="text-sm font-medium text-navy">{e.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDt(e.date)}</p>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  )
}
