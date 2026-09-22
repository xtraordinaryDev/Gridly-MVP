import { notFound } from "next/navigation"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { getInvoice } from "@/lib/data/invoices"
import { InvoiceDetailView } from "@/components/invoicing/invoice-detail-view"
import { MessageThread } from "@/components/messages/message-thread"
import { listThread } from "@/lib/data/messages"

export default async function VendorInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const invoice = await getInvoice(id, { role: "vendor", id: vendorId })
  if (!invoice) notFound()
  const messages = await listThread({ role: "vendor", id: vendorId }, "invoice", id)

  return <InvoiceDetailView invoice={invoice} role="vendor" backHref="/vendor/invoices" backLabel="Back to invoices" extra={<MessageThread threadType="invoice" threadId={id} messages={messages} role="vendor" title="Discuss this invoice" description="Replies go straight to the buyer's inbox." />} />
}
