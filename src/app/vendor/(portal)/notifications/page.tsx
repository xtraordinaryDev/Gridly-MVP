import { getCurrentVendor, getNotificationPrefs } from "@/lib/data/vendor"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { NotificationsForm } from "./notifications-form"

export default async function VendorNotificationsPage() {
  const vendor = await getCurrentVendor()
  if (!vendor) return null

  const prefs = await getNotificationPrefs(vendor.id)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Notification Preferences
        </h1>
        <p className="mt-1 text-muted-foreground">
          Control your daily opportunity digest and emergency alerts.
        </p>
      </div>

      <NotificationsForm
        vendorId={vendor.id}
        initial={prefs}
        licensedStates={vendor.licensedStates}
        preview={!isSupabaseConfigured()}
      />
    </div>
  )
}
