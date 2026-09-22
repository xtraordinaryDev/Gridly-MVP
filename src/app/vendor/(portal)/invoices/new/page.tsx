import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { listContracts } from "@/lib/data/invoices"
import { listDeliveries } from "@/lib/data/orders"
import { InvoiceForm } from "@/components/invoicing/invoice-form"

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ contract?: string }>
}) {
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const [{ contract }, contracts, unbilled] = await Promise.all([
    searchParams,
    listContracts({ role: "vendor", id: vendorId }),
    listDeliveries({ role: "vendor", id: vendorId }, { unbilledOnly: true }),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/vendor/invoices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to invoices
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">New invoice</h1>
        <p className="mt-1 text-muted-foreground">
          Add each delivery as a line item, plus any fees or taxes. Send it and the buyer gets an email with the PDF.
        </p>
      </div>
      <InvoiceForm contracts={contracts.filter((c) => c.status === "active")} defaultContractId={contract} unbilled={unbilled} />
    </div>
  )
}
