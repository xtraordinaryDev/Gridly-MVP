export default function SavedSuppliersPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-navy">Saved Suppliers</h1>
      <p className="mt-1 text-muted-foreground">
        Bookmark verified vendors from the directory for quick access.
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <p className="font-medium text-navy">No saved suppliers</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Save suppliers from their profile page in the Verified Directory.
        </p>
      </div>
    </div>
  )
}
