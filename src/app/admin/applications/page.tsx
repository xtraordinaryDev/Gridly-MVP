import { listApplications } from "@/lib/data/applications"
import { ApplicationsTable } from "./applications-table"

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const applications = await listApplications()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Applications
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review and verify vendor applications.
        </p>
      </div>

      <ApplicationsTable data={applications} initialStatus={status ?? "all"} />
    </div>
  )
}
