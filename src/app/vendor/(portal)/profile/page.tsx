import { getCurrentVendor } from "@/lib/data/vendor"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { ProfileForm } from "./profile-form"

export default async function VendorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const { preview: previewParam } = await searchParams
  const vendor = await getCurrentVendor()
  if (!vendor) return null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Company Profile
        </h1>
        <p className="mt-1 text-muted-foreground">
          Keep your profile current — buyers see this when sourcing suppliers.
        </p>
      </div>

      <ProfileForm
        vendor={vendor}
        preview={!isSupabaseConfigured()}
        defaultPreview={previewParam === "1"}
      />
    </div>
  )
}
