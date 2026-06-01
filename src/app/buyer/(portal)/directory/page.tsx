import { listVerifiedVendors } from "@/lib/data/directory"
import { DirectoryView } from "@/components/buyer/directory/directory-view"

export default async function VerifiedDirectoryPage() {
  const vendors = await listVerifiedVendors()

  return (
    <div>
      <div className="border-b border-border bg-background px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          GridLink Verified Directory
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Search and filter verified fuel suppliers nationwide — your system of record
          for qualified vendors.
        </p>
      </div>
      <DirectoryView vendors={vendors} />
    </div>
  )
}
