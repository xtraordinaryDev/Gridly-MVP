import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { requireBuyer } from "@/lib/auth"
import { listVerifiedVendors } from "@/lib/data/directory"
import { getBuyerRfpDetail } from "@/lib/data/rfps"
import { listAddressOptions } from "@/lib/data/sites"
import { RfpCreateWizard } from "@/components/buyer/rfp-create-wizard"

export default async function EditRfpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile, preview } = await requireBuyer()
  const [rfp, vendors, addresses] = await Promise.all([
    getBuyerRfpDetail(id, profile.id),
    listVerifiedVendors(),
    listAddressOptions(profile.id),
  ])
  if (!rfp) notFound()
  if (rfp.status !== "draft") redirect(`/buyer/rfps/${id}`)

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <Link
        href={`/buyer/rfps/${id}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Back to RFP
      </Link>
      <h1 className="text-2xl font-bold text-navy">Edit draft</h1>
      <p className="mt-1 text-muted-foreground">Update the details, then save or publish to invite suppliers.</p>
      <div className="mt-8">
        <RfpCreateWizard vendors={vendors} addresses={addresses} initial={rfp} preview={preview} />
      </div>
    </div>
  )
}
