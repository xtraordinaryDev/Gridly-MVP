import { listBuyerApplications } from "@/lib/data/buyer-applications"
import { BuyersTable } from "./buyers-table"

export default async function AdminBuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const applications = await listBuyerApplications()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Buyers</h1>
        <p className="mt-1 text-muted-foreground">
          Review and approve buyer organizations requesting access.
        </p>
      </div>

      <BuyersTable data={applications} initialStatus={status ?? "all"} />
    </div>
  )
}
