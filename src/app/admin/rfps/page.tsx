import { listAllRfps } from "@/lib/data/rfps"
import { AdminRfpsTable } from "./rfps-table"

export default async function AdminRfpsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const rfps = await listAllRfps()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">RFPs</h1>
        <p className="mt-1 text-muted-foreground">
          Every sourcing event on the platform, across all buyers.
        </p>
      </div>

      <AdminRfpsTable data={rfps} initialStatus={status ?? "all"} />
    </div>
  )
}
