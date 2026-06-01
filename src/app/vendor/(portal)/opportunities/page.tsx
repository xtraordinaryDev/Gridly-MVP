import { requireVendor } from "@/lib/auth"
import {
  listVendorOpportunities,
  resolveVendorIdForSession,
} from "@/lib/data/rfps"
import { OpportunitiesTable } from "@/components/vendor/opportunities-table"

export default async function VendorOpportunitiesPage() {
  const { profile, preview } = await requireVendor()
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const opportunities = await listVendorOpportunities(vendorId)

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Opportunities</h1>
        <p className="mt-1 text-muted-foreground">
          RFPs you were invited to bid on.
        </p>
      </div>
      <OpportunitiesTable opportunities={opportunities} />
    </div>
  )
}
