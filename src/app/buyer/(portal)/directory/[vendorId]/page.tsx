import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { getVendorPublicProfile } from "@/lib/data/directory"
import { VendorProfileHero } from "@/components/buyer/directory/profile/vendor-profile-hero"
import { VendorProfileTabs } from "@/components/buyer/directory/profile/vendor-profile-tabs"

export default async function DirectoryVendorProfilePage({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const { vendorId } = await params
  const profile = await getVendorPublicProfile(vendorId)
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
      <VendorProfileTabs profile={profile} />
    </div>
  )
}
