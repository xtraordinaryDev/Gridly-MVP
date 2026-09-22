import Link from "next/link"
import { AlertTriangle, Clock, Truck } from "lucide-react"

import { requireBuyer } from "@/lib/auth"
import { listDeliveries, listOrders } from "@/lib/data/orders"
import { OrdersTable } from "@/components/orders/orders-table"
import { DeliveriesTable } from "@/components/orders/deliveries-table"
import { StatTile } from "@/components/invoicing/charts"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function BuyerOrdersPage() {
  const { profile, preview } = await requireBuyer()
  const viewer = { role: "buyer" as const, id: profile.id }
  const [orders, deliveries] = await Promise.all([listOrders(viewer), listDeliveries(viewer)])
  const open = orders.filter((o) => !["delivered", "cancelled"].includes(o.status))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Orders</h1>
          <p className="mt-1 text-muted-foreground">Fuel orders against your contracts and the deliveries that fulfilled them.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/buyer/orders/new?urgency=emergency" className={cn(buttonVariants({ variant: "outline" }), "gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800")}>
            <AlertTriangle className="size-4" />
            Emergency
          </Link>
          <Link href="/buyer/orders/new" className={cn(buttonVariants(), "gap-2")}>
            <Truck className="size-4" />
            Place order
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Open orders" value={String(open.length)} icon={Truck} accent="text-brand-blue bg-brand-blue/10" />
        <StatTile label="Awaiting supplier" value={String(open.filter((o) => o.status === "requested").length)} icon={Clock} accent="text-amber-700 bg-amber-100" />
        <StatTile label="Late" value={String(open.filter((o) => o.isLate).length)} icon={AlertTriangle} accent={open.some((o) => o.isLate) ? "text-red-700 bg-red-100" : "text-muted-foreground bg-muted"} />
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">Orders</h2>
        <OrdersTable orders={orders} role="buyer" preview={preview} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">Deliveries</h2>
        <DeliveriesTable deliveries={deliveries.slice(0, 20)} role="buyer" />
      </section>
    </div>
  )
}
