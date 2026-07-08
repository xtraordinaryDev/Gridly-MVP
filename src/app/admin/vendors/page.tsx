import { listVerifiedVendors } from "@/lib/data/directory"
import { VendorsTable } from "./vendors-table"

export default async function AdminVendorsPage() {
  const vendors = await listVerifiedVendors()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Verified Vendors
        </h1>
        <p className="mt-1 text-muted-foreground">
          Every supplier in the GridLink Verified network.
        </p>
      </div>

      <VendorsTable data={vendors} />
    </div>
  )
}
