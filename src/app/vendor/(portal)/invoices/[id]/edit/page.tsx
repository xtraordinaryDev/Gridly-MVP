import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { getInvoice, listContracts } from "@/lib/data/invoices"
import { listDeliveries } from "@/lib/data/orders"
import { InvoiceForm } from "@/components/invoicing/invoice-form"

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const viewer = { role: "vendor" as const, id: vendorId }
  const [invoice, contracts, unbilled] = await Promise.all([getInvoice(id, viewer), listContracts(viewer), listDeliveries(viewer, { unbilledOnly: true })])
  if (!invoice) notFound()
  if (invoice.status !== "draft") redirect(`/vendor/invoices/${id}`)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={`/vendor/invoices/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to {invoice.number}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Edit {invoice.number}</h1>
        <p className="mt-1 text-muted-foreground">Drafts can be edited until they are sent.</p>
      </div>
      <InvoiceForm contracts={contracts} initial={invoice} unbilled={unbilled} />
    </div>
  )
}
