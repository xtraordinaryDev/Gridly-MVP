import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { requireBuyer } from "@/lib/auth"
import { listContracts } from "@/lib/data/invoices"
import { listAddressOptions } from "@/lib/data/sites"
import { PlaceOrderForm } from "@/components/orders/place-order-form"

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ contract?: string; urgency?: string }> }) {
  const { profile } = await requireBuyer()
  const [{ contract, urgency }, contracts, addresses] = await Promise.all([
    searchParams,
    listContracts({ role: "buyer", id: profile.id }),
    listAddressOptions(profile.id),
  ])
  const emergency = urgency === "emergency"
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/buyer/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to orders
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">{emergency ? "Emergency fuel order" : "Place an order"}</h1>
        <p className="mt-1 text-muted-foreground">
          {emergency ? "Your supplier is emailed immediately and the order jumps to the top of their queue." : "Order against an awarded contract. The supplier confirms a delivery date, then logs the ticket."}
        </p>
      </div>
      <PlaceOrderForm contracts={contracts.filter((c) => c.status === "active")} addresses={addresses} defaultContractId={contract} defaultUrgency={emergency ? "emergency" : "standard"} />
    </div>
  )
}
