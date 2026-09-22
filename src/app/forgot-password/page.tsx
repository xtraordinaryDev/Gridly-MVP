import type { Metadata } from "next"
import Link from "next/link"
import { Zap } from "lucide-react"

import { ForgotPasswordForm } from "./forgot-password-form"

export const metadata: Metadata = { title: "Reset password — GridLink" }

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
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
          <h1 className="text-xl font-bold text-navy">Reset your password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send a link to choose a new password.
          </p>
          {error === "link" ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              That reset link is invalid or has expired. Request a new one below.
            </p>
          ) : null}
          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </main>
  )
}
