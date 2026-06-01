import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { listVerifiedVendors } from "@/lib/data/directory"
import { RfpCreateWizard } from "@/components/buyer/rfp-create-wizard"

export default async function CreateRfpPage() {
  const vendors = await listVerifiedVendors()

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/buyer/rfps"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Back to RFPs
      </Link>
      <h1 className="text-2xl font-bold text-navy">Create RFP</h1>
      <p className="mt-1 text-muted-foreground">
        Multi-step wizard — publish to invite verified suppliers.
      </p>
      <div className="mt-8">
        <RfpCreateWizard vendors={vendors} />
      </div>
    </div>
  )
}
