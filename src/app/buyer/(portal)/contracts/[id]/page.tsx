import { notFound } from "next/navigation"

import { requireBuyer } from "@/lib/auth"
import { getContract, listInvoices } from "@/lib/data/invoices"
import { listDeliveries, listOrders } from "@/lib/data/orders"
import { ContractDetailView } from "@/components/orders/contract-detail-view"
import { MessageThread } from "@/components/messages/message-thread"
import { listThread } from "@/lib/data/messages"
import { getContractRating } from "@/lib/data/ratings"
import { RatingCard } from "@/components/orders/rating-card"

export default async function BuyerContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile, preview } = await requireBuyer()
  const viewer = { role: "buyer" as const, id: profile.id }
  const [contract, orders, deliveries, invoices] = await Promise.all([
    getContract(id, viewer),
    listOrders(viewer, { contractId: id }),
    listDeliveries(viewer, { contractId: id }),
    listInvoices(viewer),
  ])
  if (!contract) notFound()
  const [messages, rating] = await Promise.all([listThread(viewer, "contract", id), getContractRating(id)])
  return <ContractDetailView contract={contract} orders={orders} deliveries={deliveries} invoices={invoices.filter((i) => i.contractId === id)} role="buyer" preview={preview} extra={<div className="grid gap-6 lg:grid-cols-3"><div className="lg:col-span-2"><MessageThread threadType="contract" threadId={id} messages={messages} role="buyer" title="Messages" description="Scheduling changes, site access, anything about this contract." /></div><RatingCard contractId={id} vendorName={contract.vendorName} existing={rating} editable={true} /></div>} />
}
