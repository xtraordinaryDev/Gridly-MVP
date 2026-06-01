import type { Metadata } from "next"
import Link from "next/link"
import { BadgeCheck, CheckCircle2, Clock, Mail } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "Application Submitted — GridLink",
  robots: { index: false, follow: false },
}

const NEXT_STEPS = [
  {
    icon: Clock,
    title: "Under review (1–2 weeks)",
    description:
      "The GridLink team will review your company info, insurance, and certifications.",
  },
  {
    icon: Mail,
    title: "We may reach out",
    description:
      "If we need clarification on anything, we'll contact your sales rep directly.",
  },
  {
    icon: BadgeCheck,
    title: "Get GridLink Verified",
    description:
      "Once complete, you'll receive next steps via email to create your account.",
  },
]

export default function SubmittedPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-accent/30 px-4 py-16 sm:py-24">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald/15 text-emerald">
            <CheckCircle2 className="size-9" />
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Thank you for submitting your Vendor Profile.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Your application to become a GridLink Verified Supplier is now under
            review. This typically takes 1–2 weeks. We may reach out for
            clarification. Once complete, you&apos;ll receive next steps via
            email.
          </p>

          <div className="mt-8 space-y-3 text-left">
            {NEXT_STEPS.map((s) => (
              <div
                key={s.title}
                className="flex items-start gap-3 rounded-xl border border-border bg-background p-4"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                  <s.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy">{s.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/"
            className={`${buttonVariants({ variant: "outline" })} mt-8`}
          >
            Back to GridLink
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
