import { notFound } from "next/navigation"

import { requireBuyer } from "@/lib/auth"
import { getInvoice } from "@/lib/data/invoices"
import { InvoiceDetailView } from "@/components/invoicing/invoice-detail-view"
import { MessageThread } from "@/components/messages/message-thread"
import { listThread } from "@/lib/data/messages"

export default async function BuyerInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile } = await requireBuyer()
  const invoice = await getInvoice(id, { role: "buyer", id: profile.id })
  if (!invoice || invoice.status === "draft") notFound()
  const messages = await listThread({ role: "buyer", id: profile.id }, "invoice", id)

  return <InvoiceDetailView invoice={invoice} role="buyer" backHref="/buyer/invoices" backLabel="Back to invoices" extra={<MessageThread threadType="invoice" threadId={id} messages={messages} role="buyer" title="Discuss this invoice" description="Questions about a charge, a ticket mismatch, or when payment is coming." />} />
}
