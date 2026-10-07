import { listAdminVendors } from "@/lib/data/admin-vendors"
import { VendorsTable } from "./vendors-table"

export default async function AdminVendorsPage() {
  const vendors = await listAdminVendors()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Vendors
        </h1>
        <p className="mt-1 text-muted-foreground">
          Every approved supplier. Suspended vendors stay here but are hidden from buyers.
        </p>
      </div>

      <VendorsTable data={vendors} />
    </div>
  )
}
