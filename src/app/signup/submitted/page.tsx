import type { Metadata } from "next"
import Link from "next/link"
import { GridLinkLogo } from "@/components/brand/logo"
import { CheckCircle2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Request received — GridLink",
  robots: { index: false, follow: false },
}

export default function BuyerRequestSubmittedPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-accent/30 px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <GridLinkLogo />
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald/15 text-emerald">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-navy">Request received</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks for requesting access to GridLink. Our team will review your organization and
            reach out within 1–2 business days. If approved, you&apos;ll receive an email with a
            link to create your account.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Already have a GridLink account?{" "}
            <Link href="/login" className="font-medium text-brand-blue hover:underline">
              Sign in
            </Link>{" "}
            or{" "}
            <Link href="/forgot-password" className="font-medium text-brand-blue hover:underline">
              reset your password
            </Link>
            .
          </p>
          <Link href="/" className={`${buttonVariants({ variant: "outline" })} mt-6`}>
            Back to GridLink
          </Link>
        </div>
      </div>
    </main>
  )
}
