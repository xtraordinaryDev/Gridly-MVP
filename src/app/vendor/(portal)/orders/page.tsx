import { AlertTriangle, Clock, PackageCheck, Truck } from "lucide-react"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { listDeliveries, listOrders } from "@/lib/data/orders"
import { OrdersTable } from "@/components/orders/orders-table"
import { DeliveriesTable } from "@/components/orders/deliveries-table"
import { StatTile } from "@/components/invoicing/charts"

export default async function VendorOrdersPage() {
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const viewer = { role: "vendor" as const, id: vendorId }
  const [orders, deliveries] = await Promise.all([listOrders(viewer), listDeliveries(viewer)])
  const open = orders.filter((o) => !["delivered", "cancelled"].includes(o.status))
  const emergencies = open.filter((o) => o.urgency === "emergency")
  const unbilled = deliveries.filter((d) => !d.invoiceId)
  const sorted = [...orders].sort((a, b) => {
    const rank = (o: typeof a) => (["delivered", "cancelled"].includes(o.status) ? 2 : o.urgency === "emergency" ? 0 : 1)
    return rank(a) - rank(b) || a.windowEnd.localeCompare(b.windowEnd)
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Orders &amp; deliveries</h1>
        <p className="mt-1 text-muted-foreground">Confirm buyer orders, schedule drops, and log delivery tickets. Logged deliveries flow straight into invoices.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Open orders" value={String(open.length)} icon={Truck} accent="text-brand-blue bg-brand-blue/10" />
        <StatTile label="Emergency" value={String(emergencies.length)} icon={AlertTriangle} accent={emergencies.length ? "text-red-700 bg-red-100" : "text-muted-foreground bg-muted"} />
        <StatTile label="Awaiting confirmation" value={String(open.filter((o) => o.status === "requested").length)} icon={Clock} accent="text-amber-700 bg-amber-100" />
        <StatTile label="Unbilled deliveries" value={String(unbilled.length)} hint={`${unbilled.reduce((s, d) => s + d.gallons, 0).toLocaleString()} gal`} icon={PackageCheck} accent="text-emerald bg-emerald/15" />
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">Orders</h2>
        <OrdersTable orders={sorted} role="vendor" preview={preview} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">Recent deliveries</h2>
        <DeliveriesTable deliveries={deliveries.slice(0, 20)} role="vendor" />
      </section>
    </div>
  )
}
