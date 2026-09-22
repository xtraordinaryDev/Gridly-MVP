import type { Metadata } from "next"
import Link from "next/link"
import { Zap } from "lucide-react"

import { getSessionProfile } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = { title: "Choose a new password — GridLink" }

export default async function ResetPasswordPage() {
  const profile = isSupabaseConfigured() ? await getSessionProfile() : { id: "preview" }
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-accent/30 px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-navy-foreground">
            <Zap className="size-4 fill-brand-blue text-brand-blue" />
          </span>
          <span className="text-lg font-bold tracking-tight text-navy">
            Grid<span className="text-brand-blue">Link</span>
          </span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {profile ? (
            <>
              <h1 className="text-xl font-bold text-navy">Choose a new password</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">At least 8 characters. You&apos;ll be signed in afterwards.</p>
              <div className="mt-6">
                <ResetPasswordForm />
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-navy">This link has expired</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Reset links work once and expire after an hour.</p>
              <Link href="/forgot-password" className={cn(buttonVariants(), "mt-6 w-full")}>Request a new link</Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
