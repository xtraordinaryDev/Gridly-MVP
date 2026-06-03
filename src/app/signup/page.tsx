import type { Metadata } from "next"
import Link from "next/link"
import { Zap } from "lucide-react"

import { isSupabaseConfigured } from "@/lib/supabase/config"
import { SignupForm } from "./signup-form"

export const metadata: Metadata = {
  title: "Request access — GridLink",
  description: "Request a buyer account to source fuel and manage RFPs on GridLink.",
}

export default function SignupPage() {
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
          <h1 className="text-xl font-bold text-navy">Request buyer access</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tell us about your organization. Our team reviews requests and sends approved buyers a
            link to create their account.
          </p>
          <div className="mt-6">
            <SignupForm preview={!isSupabaseConfigured()} />
          </div>
        </div>
      </div>
    </main>
  )
}
