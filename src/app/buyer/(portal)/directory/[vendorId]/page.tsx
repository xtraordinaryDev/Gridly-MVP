import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { getVendorPublicProfile } from "@/lib/data/directory"
import { getVendorPerformance } from "@/lib/data/ratings"
import { PerformanceBadges } from "@/components/orders/rating-card"
import { Card, CardContent } from "@/components/ui/card"
import { VendorProfileHero } from "@/components/buyer/directory/profile/vendor-profile-hero"
import { VendorProfileTabs } from "@/components/buyer/directory/profile/vendor-profile-tabs"

export default async function DirectoryVendorProfilePage({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const { vendorId } = await params
  const [profile, perf] = await Promise.all([getVendorPublicProfile(vendorId), getVendorPerformance(vendorId)])
  if (!profile) notFound()

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/buyer/directory"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Back to directory
      </Link>

      <VendorProfileHero profile={profile} />
      <Card className="mt-4">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Track record on GridLink</p>
            <PerformanceBadges className="mt-1 text-sm" avgStars={perf.avgStars} ratingCount={perf.ratingCount} onTimePct={perf.onTimePct} awardsCount={perf.awardsCount} />
          </div>
          <dl className="grid grid-cols-3 gap-4 text-center text-sm">
            <div><dt className="text-xs text-muted-foreground">Deliveries</dt><dd className="font-semibold text-navy">{perf.deliveriesCount}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Active contracts</dt><dd className="font-semibold text-navy">{perf.activeContracts}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Awards</dt><dd className="font-semibold text-navy">{perf.awardsCount}</dd></div>
          </dl>
        </CardContent>
      </Card>
      <VendorProfileTabs profile={profile} />
    </div>
  )
}
