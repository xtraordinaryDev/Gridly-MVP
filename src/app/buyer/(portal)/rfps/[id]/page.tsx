import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { requireBuyer } from "@/lib/auth"
import { getBuyerRfpDetail } from "@/lib/data/rfps"
import { listRfpThreadParties, listThread } from "@/lib/data/messages"
import { listVendorPerformance } from "@/lib/data/ratings"
import { getStoredBrief } from "@/lib/data/ai-briefs"
import { RfpDetailView } from "@/components/buyer/rfp-detail-view"

export default async function BuyerRfpDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; vendor?: string }>
}) {
  const { id } = await params
  const { tab, vendor } = await searchParams
  const { profile } = await requireBuyer()
  const rfp = await getBuyerRfpDetail(id, profile.id)
  if (!rfp) notFound()
  const viewer = { role: "buyer" as const, id: profile.id }
  const activeVendorId = vendor && rfp.invitations.some((i) => i.vendorId === vendor) ? vendor : null
  const [parties, messages, perfMap, stored] = await Promise.all([
    listRfpThreadParties(profile.id, id),
    listThread(viewer, "rfp", id, activeVendorId),
    listVendorPerformance(rfp.responses.map((r) => r.vendorId)),
    getStoredBrief(id, profile.id),
  ])
  const performance = Object.fromEntries(perfMap)

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/buyer/rfps"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Back to RFPs
      </Link>
      <RfpDetailView rfp={rfp} defaultTab={tab && ["overview", "invited", "responses", "qa", "activity"].includes(tab) ? tab : "overview"} qa={{ parties, activeVendorId, messages }} performance={performance} brief={stored ? { brief: stored.brief, generatedAt: stored.generatedAt } : null} />
    </div>
  )
}
