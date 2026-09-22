import Link from "next/link"
import { Leaf } from "lucide-react"

import { requireBuyer } from "@/lib/auth"
import { listBuyerSites } from "@/lib/data/sites"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProfileForm, SitesManager } from "./settings-forms"

export default async function BuyerSettingsPage() {
  const { profile } = await requireBuyer()
  const sites = await listBuyerSites(profile.id)
  let email: string | null = "jordan.kim@metrotransit.example.com"
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    email = (await supabase.auth.getUser()).data.user?.email ?? null
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="mt-1 text-muted-foreground">Organization profile, delivery sites, and reporting preferences.</p>
      </div>

      <ProfileForm fullName={profile.fullName ?? ""} companyName={profile.companyName ?? ""} email={email} />
      <SitesManager sites={sites} />

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald/15 text-emerald">
              <Leaf className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-navy">Emissions target</h2>
              <p className="text-sm text-muted-foreground">Set or update your annual Scope 1 target from the dashboard.</p>
            </div>
          </div>
          <Link href="/buyer/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>Open dashboard</Link>
        </CardContent>
      </Card>
    </div>
  )
}
