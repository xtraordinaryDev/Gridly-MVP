import Link from "next/link"
import { ArrowLeft, Droplet, FilePlus, Handshake, Receipt, Truck } from "lucide-react"

import type { ContractSummary, InvoiceListItem, PartyRole } from "@/lib/invoicing/types"
import { money } from "@/lib/invoicing/types"
import type { DeliveryView, OrderView } from "@/lib/data/orders"
import { summarizeFulfilment } from "@/lib/data/orders"
import { OrdersTable } from "@/components/orders/orders-table"
import { DeliveriesTable } from "@/components/orders/deliveries-table"
import { LogDeliveryButton } from "@/components/orders/log-delivery-dialog"
import { InvoicesTable } from "@/components/invoicing/invoices-table"
import { StatTile } from "@/components/invoicing/charts"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function ContractDetailView({
  contract,
  orders,
  deliveries,
  invoices,
  role,
  preview,
  extra,
}: {
  contract: ContractSummary
  orders: OrderView[]
  deliveries: DeliveryView[]
  invoices: InvoiceListItem[]
  role: PartyRole
  preview: boolean
  /** Slot for messaging / rating panels */
  extra?: React.ReactNode
}) {
  const f = summarizeFulfilment(orders, deliveries)
  const base = role === "buyer" ? "/buyer" : "/vendor"
  const pricing =
    contract.pricingMode === "index"
      ? `${contract.indexName ?? "Index"} ${contract.differential != null ? (contract.differential >= 0 ? "+ $" : "− $") + Math.abs(contract.differential).toFixed(4) : ""}/gal`
      : `$${contract.pricePerGallon.toFixed(4)}/gal fixed`

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href={`${base}/contracts`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to contracts
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Handshake className="size-5 text-emerald" />
                <h1 className="text-2xl font-bold tracking-tight text-navy">{contract.title}</h1>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", contract.status === "active" ? "bg-emerald/15 text-emerald" : "bg-muted text-muted-foreground")}>{contract.status}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {role === "buyer" ? `Supplier: ${contract.vendorName}` : `Buyer: ${contract.buyerName}`} · awarded {fmt(contract.awardedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {role === "buyer" && contract.status === "active" ? (
                <>
                  <Link href={`/buyer/orders/new?contract=${contract.id}`} className={cn(buttonVariants(), "gap-2")}>
                    <Truck className="size-4" />
                    Place order
                  </Link>
                  <Link href={`/buyer/orders/new?contract=${contract.id}&urgency=emergency`} className={cn(buttonVariants({ variant: "outline" }), "gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800")}>
                    Emergency order
                  </Link>
                </>
              ) : null}
              {role === "vendor" && contract.status === "active" ? (
                <>
                  <LogDeliveryButton contractId={contract.id} preview={preview} />
                  <Link href={`/vendor/invoices/new?contract=${contract.id}`} className={cn(buttonVariants(), "gap-2")}>
                    <FilePlus className="size-4" />
                    New invoice
                  </Link>
                </>
              ) : null}
            </div>
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Fuel</dt><dd className="font-medium">{contract.fuelType || "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Pricing</dt><dd className="font-medium">{pricing}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Contract volume</dt><dd className="font-medium">{contract.quantityGallons.toLocaleString()} gal</dd></div>
            <div><dt className="text-xs text-muted-foreground">Terms</dt><dd className="font-medium">{contract.deliveryTerms ?? `Net ${contract.netDays}`}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Delivered" value={`${f.deliveredGallons.toLocaleString()} gal`} hint={`of ${contract.quantityGallons.toLocaleString()}`} icon={Droplet} accent="text-brand-blue bg-brand-blue/10" />
        <StatTile label="Open orders" value={String(f.openOrders)} hint={`${f.orderedGallons.toLocaleString()} gal ordered`} icon={Truck} accent="text-navy bg-navy/10" />
        <StatTile label="On-time deliveries" value={f.onTimePct == null ? "—" : `${f.onTimePct}%`} icon={Truck} accent={f.onTimePct != null && f.onTimePct < 90 ? "text-amber-700 bg-amber-100" : "text-emerald bg-emerald/15"} />
        <StatTile label="Invoiced" value={money(contract.invoicedTotal)} hint={`${money(contract.paidTotal)} paid · ${f.unbilledGallons.toLocaleString()} gal unbilled`} icon={Receipt} accent="text-emerald bg-emerald/15" />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">Orders</h2>
        <OrdersTable orders={orders} role={role} showContract={false} preview={preview} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">Deliveries</h2>
        <DeliveriesTable deliveries={deliveries} role={role} showContract={false} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">Invoices</h2>
          <Link href={`${base}/invoices`} className="text-sm font-medium text-brand-blue hover:underline">All invoices</Link>
        </div>
        <InvoicesTable data={invoices} basePath={`${base}/invoices`} party={role === "buyer" ? "vendor" : "buyer"} hideDrafts={role === "buyer"} compact />
      </section>

      {extra}
    </div>
  )
}
