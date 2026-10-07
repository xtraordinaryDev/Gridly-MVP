import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { GridLinkLogo } from "@/components/brand/logo"

import { getSessionProfile, roleHomePath } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { isDemoModeEnabled } from "@/lib/env"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Sign in — GridLink",
}

export default async function LoginPage() {
  // Already signed in: the form would only confuse — go to their portal.
  const profile = await getSessionProfile()
  if (profile) redirect(roleHomePath(profile.role))

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-accent/30 px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <GridLinkLogo />
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-xl font-bold text-navy">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Access your GridLink buyer, vendor, or admin portal.
          </p>
          <div className="mt-6">
            <LoginForm preview={!isSupabaseConfigured()} showDemo={isDemoModeEnabled()} />
          </div>
        </div>
      </div>
    </main>
  )
}
