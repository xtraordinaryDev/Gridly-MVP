import Link from "next/link"

import { requireBuyer } from "@/lib/auth"
import { listSavedVendors } from "@/lib/data/saved"
import { VendorCard } from "@/components/buyer/directory/vendor-card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function SavedSuppliersPage() {
  const { profile } = await requireBuyer()
  const vendors = await listSavedVendors(profile.id)

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-navy">Saved Suppliers</h1>
      <p className="mt-1 text-muted-foreground">
        Verified suppliers you&apos;ve bookmarked from the directory.
      </p>
      {vendors.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="font-medium text-navy">No saved suppliers</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a supplier in the Verified Directory and choose &ldquo;Save to List&rdquo;.
          </p>
          <Link href="/buyer/directory" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
            Browse the directory
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      )}
    </div>
  )
}
