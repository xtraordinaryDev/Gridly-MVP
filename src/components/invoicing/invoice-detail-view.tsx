import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Eye,
  FilePlus,
  Send,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import type { InvoiceDetail, InvoiceEventType, PartyRole } from "@/lib/invoicing/types"
import { money } from "@/lib/invoicing/types"
import { factorFor, formatTons } from "@/lib/emissions/factors"
import { InvoiceStatusBadge } from "@/components/invoicing/invoice-status-badge"
import { InvoiceActions } from "@/components/invoicing/invoice-actions"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function fmtDate(value: string | null, withTime = false) {
  if (!value) return "—"
  const d = new Date(value.length === 10 ? value + "T12:00:00Z" : value)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  })
}

const EVENT_ICON: Record<InvoiceEventType, LucideIcon> = {
  created: FilePlus,
  sent: Send,
  viewed: Eye,
  disputed: AlertTriangle,
  dispute_resolved: CheckCircle2,
  payment_recorded: Wallet,
  paid: CheckCircle2,
  voided: Ban,
  reminder_sent: Send,
  note: FilePlus,
}

const EVENT_LABEL: Record<InvoiceEventType, string> = {
  created: "Invoice created",
  sent: "Sent to buyer",
  viewed: "Viewed by buyer",
  disputed: "Disputed by buyer",
  dispute_resolved: "Dispute resolved",
  payment_recorded: "Payment recorded",
  paid: "Paid in full",
  voided: "Invoice voided",
  reminder_sent: "Reminder sent",
  note: "Note",
}

export function InvoiceDetailView({
  invoice,
  role,
  backHref,
  backLabel,
  readOnly = false,
  extra,
}: {
  invoice: InvoiceDetail
  role: PartyRole
  backHref?: string
  backLabel?: string
  readOnly?: boolean
  extra?: React.ReactNode
}) {
  const counterpartyLabel = role === "buyer" ? "From" : "Bill to"
  const counterparty = role === "buyer" ? invoice.vendorName : invoice.buyerName

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {backHref ? (
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {backLabel ?? "Back"}
        </Link>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-navy">{invoice.number}</h1>
                <InvoiceStatusBadge status={invoice.status} overdue={invoice.isOverdue} />
                {invoice.isOverdue ? (
                  <span className="text-xs text-red-700">{invoice.daysOverdue} days past due</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{invoice.contractTitle}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {invoice.status === "paid" ? "Paid" : "Balance due"}
              </p>
              <p className="text-3xl font-bold tabular-nums text-navy">
                {money(invoice.status === "paid" ? invoice.total : invoice.balance)}
              </p>
              {invoice.amountPaid > 0 && invoice.status !== "paid" ? (
                <p className="text-xs text-muted-foreground">{money(invoice.amountPaid)} of {money(invoice.total)} paid</p>
              ) : null}
            </div>
          </div>

          {invoice.status === "disputed" && invoice.disputeReason ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-semibold">Disputed {fmtDate(invoice.disputedAt)}</p>
              <p className="mt-1">{invoice.disputeReason}</p>
            </div>
          ) : null}

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">{counterpartyLabel}</dt>
              <dd className="font-medium">{counterparty}</dd>
              {role === "buyer" && invoice.vendorAddress ? (
                <dd className="text-xs text-muted-foreground">{invoice.vendorAddress}</dd>
              ) : null}
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Issued</dt>
              <dd className="font-medium">{fmtDate(invoice.issueDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Due</dt>
              <dd className={cn("font-medium", invoice.isOverdue && "text-red-700")}>{fmtDate(invoice.dueDate)}</dd>
              <dd className="text-xs text-muted-foreground">Net {invoice.contract.netDays}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Contract rate</dt>
              <dd className="font-medium">${invoice.contract.pricePerGallon.toFixed(4)}/gal · {invoice.contract.fuelType}</dd>
            </div>
          </dl>

          {!readOnly ? (
            <div className="mt-6 border-t border-border pt-4">
              <InvoiceActions invoice={invoice} role={role} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Delivered</th>
                  <th className="px-4 py-3 text-left font-medium">Ticket #</th>
                  <th className="px-4 py-3 text-right font-medium">Gallons</th>
                  <th className="px-4 py-3 text-right font-medium">$/gal</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((l, i) => (
                  <tr key={l.id ?? i} className="border-t border-border">
                    <td className="px-4 py-3">
                      {l.description}
                      {l.kind !== "fuel" ? (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{l.kind}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{l.deliveryDate ? fmtDate(l.deliveryDate) : ""}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.ticketNumber ?? ""}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.gallons ? l.gallons.toLocaleString("en-US") : ""}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.pricePerGallon ? `$${l.pricePerGallon.toFixed(4)}` : ""}</td>
                    <td className={cn("px-4 py-3 text-right tabular-nums", l.amount < 0 && "text-emerald")}>{money(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t border-border p-4">
            <dl className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{money(invoice.subtotal)}</dd></div>
              {invoice.feesTotal ? <div className="flex justify-between"><dt className="text-muted-foreground">Fees</dt><dd className="tabular-nums">{money(invoice.feesTotal)}</dd></div> : null}
              {invoice.taxTotal ? <div className="flex justify-between"><dt className="text-muted-foreground">Taxes</dt><dd className="tabular-nums">{money(invoice.taxTotal)}</dd></div> : null}
              <div className="flex justify-between border-t border-border pt-1 text-base font-semibold text-navy"><dt>Total</dt><dd className="tabular-nums">{money(invoice.total)}</dd></div>
              {invoice.amountPaid > 0 ? (
                <>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Paid</dt><dd className="tabular-nums">-{money(invoice.amountPaid)}</dd></div>
                  <div className="flex justify-between font-semibold"><dt>Balance</dt><dd className="tabular-nums">{money(invoice.balance)}</dd></div>
                </>
              ) : null}
            </dl>
          </div>
          {(() => {
            const gal = invoice.lineItems.filter((l) => l.kind === "fuel").reduce((s, l) => s + (l.gallons ?? 0), 0)
            if (!gal) return null
            const f = factorFor(invoice.contract.fuelType)
            return (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <span>Estimated Scope 1 emissions · {gal.toLocaleString("en-US")} gal {f.label} × {f.kgPerGallon} kg/gal</span>
                <span className="font-medium text-emerald">{formatTons((f.kgPerGallon * gal) / 1000)} CO2e{f.renewable ? " (renewable, lifecycle-credited)" : ""}</span>
              </div>
            )
          })()}
          {invoice.notes ? (
            <div className="border-t border-border p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-navy">Payments</h2>
            {invoice.payments.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium">{money(p.amount)} via {p.method.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(p.paidAt)}{p.reference ? ` · Ref ${p.reference}` : ""}{p.recordedRole ? ` · recorded by ${p.recordedRole}` : ""}
                      </p>
                      {p.note ? <p className="mt-0.5 text-xs text-muted-foreground">{p.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-navy">Activity</h2>
            <ol className="mt-3 space-y-4">
              {invoice.events.map((e, i) => {
                const Icon = EVENT_ICON[e.type] ?? FilePlus
                return (
                  <li key={e.id} className="relative flex gap-3">
                    {i < invoice.events.length - 1 ? (
                      <span className="absolute left-[15px] top-9 h-[calc(100%-4px)] w-px bg-border" />
                    ) : null}
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-navy">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="leading-snug">
                        {EVENT_LABEL[e.type]}
                        {e.amount != null ? <span className="font-medium"> · {money(e.amount)}</span> : null}
                      </p>
                      {e.message ? <p className="text-xs text-muted-foreground">{e.message}</p> : null}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDate(e.createdAt, true)}{e.actorRole ? ` · ${e.actorRole}` : ""}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      </div>
      {extra}
    </div>
  )
}
