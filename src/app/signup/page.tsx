import type { Metadata } from "next"
import Link from "next/link"
import { GridLinkLogo } from "@/components/brand/logo"

import { isSupabaseConfigured } from "@/lib/supabase/config"
import { SignupForm } from "./signup-form"

export const metadata: Metadata = {
  title: "Request access — GridLink",
  description: "Request a buyer account to source fuel and manage RFPs on GridLink.",
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center bg-accent/30 px-4 py-12 sm:py-16">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2">
        <GridLinkLogo />
      </Link>

      <div className="w-full max-w-4xl">
        <div className="text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Start here to request buyer access.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Four quick questions so we can set your account up right. Takes about a minute.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-card/60 p-6 shadow-sm sm:p-10">
          <SignupForm preview={!isSupabaseConfigured()} />
        </div>
      </div>
    </main>
  )
}
