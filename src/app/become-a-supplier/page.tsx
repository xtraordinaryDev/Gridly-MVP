import type { Metadata } from "next"
import { BadgeCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { SupplierInterestForm } from "./supplier-interest-form"

export const metadata: Metadata = {
  title: "Become a Supplier — GridLink",
  description:
    "Join the GridLink Verified Network. Tell us about your company and our team will reach out with onboarding next steps.",
}

export default function BecomeASupplierPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1 bg-accent/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="text-center">
            <Badge className="mb-5 gap-1.5 rounded-full bg-emerald/15 text-emerald">
              <BadgeCheck className="size-3.5" />
              GridLink Verified Network
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Become a Supplier
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Tell us a bit about your company. This is a quick interest form —
              once we review it, we&apos;ll send a secure link to complete your
              full verification profile.
            </p>
          </div>

          <div className="mt-10">
            <SupplierInterestForm />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
