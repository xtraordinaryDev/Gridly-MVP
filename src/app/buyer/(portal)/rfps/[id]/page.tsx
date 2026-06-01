import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { requireBuyer } from "@/lib/auth"
import { getBuyerRfpDetail } from "@/lib/data/rfps"
import { RfpDetailView } from "@/components/buyer/rfp-detail-view"

export default async function BuyerRfpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile } = await requireBuyer()
  const rfp = await getBuyerRfpDetail(id, profile.id)
  if (!rfp) notFound()

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/buyer/rfps"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Back to RFPs
      </Link>
      <RfpDetailView rfp={rfp} />
    </div>
  )
}
