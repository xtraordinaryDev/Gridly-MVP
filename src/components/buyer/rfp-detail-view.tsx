"use client"

import Link from "next/link"
import { format } from "date-fns"

import type { BuyerRfpDetail } from "@/lib/rfp/types"
import { RfpStatusBadge } from "@/components/buyer/rfp-status-badge"
import { RfpComparisonTable } from "@/components/buyer/rfp-comparison-table"
import { RfpLifecycleActions } from "@/components/buyer/rfp-lifecycle-actions"
import { AttachmentList } from "@/components/attachments"
import { RfpQandA } from "@/components/messages/message-thread"
import type { MessageView, ThreadParty } from "@/lib/data/messages"
import type { VendorPerformance } from "@/lib/data/ratings"
import type { BidBrief } from "@/lib/ai/schemas"
import { BidBriefPanel } from "@/components/ai/bid-brief"
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

export function RfpDetailView({
  rfp,
  defaultTab = "overview",
  qa,
  performance,
  brief = null,
}: {
  rfp: BuyerRfpDetail
  defaultTab?: string
  qa?: { parties: ThreadParty[]; activeVendorId: string | null; messages: MessageView[] }
  performance?: Record<string, VendorPerformance>
  brief?: { brief: BidBrief; generatedAt: string } | null
}) {
  const canAward = rfp.status === "published" || rfp.status === "closed"

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
              <dt className="text-xs text-muted-foreground">Pricing</dt>
              <dd className="font-medium">{rfp.pricingMode === "index" ? `Index + diff · ${rfp.indexName ?? ""}` : "Fixed $/gal"}</dd>
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
          <div className="w-full border-t border-border pt-4">
            <RfpLifecycleActions rfp={rfp} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultTab}>
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start border-b bg-transparent p-0">
          {["overview", "invited", "responses", "qa", "activity"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent px-4 py-3 capitalize data-active:border-brand-blue data-active:bg-transparent"
            >
              {tab === "invited" ? "Invited Suppliers" : tab === "qa" ? `Q&A${qa?.parties.reduce((n, p) => n + p.unread, 0) ? " •" : ""}` : tab}
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
            <h3 className="text-sm font-semibold text-navy">Delivery sites</h3>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left font-medium">Site</th><th className="px-3 py-2 text-right font-medium">Gallons</th><th className="px-3 py-2 text-right font-medium">Tank</th><th className="px-3 py-2 text-left font-medium">Window</th></tr>
                </thead>
                <tbody>
                  {rfp.deliverySites.map((site, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2">{site.address}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{site.gallons ? site.gallons.toLocaleString() : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{site.tankSizeGallons ? site.tankSizeGallons.toLocaleString() : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{site.deliveryWindow ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rfp.attachments.length ? (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-navy">Attachments</h3>
                <AttachmentList attachments={rfp.attachments} className="mt-2" />
              </div>
            ) : null}
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
          <BidBriefPanel rfpId={rfp.id} initial={brief} responseCount={rfp.responses.length} />
          <RfpComparisonTable rfp={rfp} canAward={canAward} performance={performance} />
        </TabsContent>

        <TabsContent value="qa" className="mt-6">
          {qa ? (
            <RfpQandA rfpId={rfp.id} parties={qa.parties} activeVendorId={qa.activeVendorId} messages={qa.messages} />
          ) : (
            <p className="text-sm text-muted-foreground">Questions from invited suppliers will appear here.</p>
          )}
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
