import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, BadgeCheck, ShieldCheck } from "lucide-react"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { buttonVariants } from "@/components/ui/button"
import { CreateAccountForm } from "./create-account-form"

export const metadata: Metadata = {
  title: "Create your account — GridLink",
  robots: { index: false, follow: false },
}

type LoadResult =
  | { state: "ok" | "preview"; email: string; companyName: string }
  | { state: "invalid" }
  | { state: "not_approved" }

async function load(token: string): Promise<LoadResult> {
  if (!isSupabaseConfigured()) {
    return {
      state: "preview",
      email: "marcus@apexfuel.com",
      companyName: "Apex Fuel Co.",
    }
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("vendor_applications")
    .select("status, company_name, sales_rep_email")
    .eq("invitation_token", token)
    .maybeSingle()

  if (!data) return { state: "invalid" }
  if (data.status !== "approved") return { state: "not_approved" }

  return {
    state: "ok",
    email: (data.sales_rep_email as string) ?? "",
    companyName: (data.company_name as string) ?? "your company",
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-accent/30 px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-navy-foreground">
            <ShieldCheck className="size-4 text-brand-blue" />
          </span>
          <span className="text-lg font-bold tracking-tight text-navy">
            Grid<span className="text-brand-blue">Link</span>
          </span>
        </Link>
        {children}
      </div>
    </main>
  )
}

export default async function CreateAccountPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await load(token)

  if (result.state === "invalid" || result.state === "not_approved") {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-navy">
            {result.state === "not_approved"
              ? "Not approved yet"
              : "Invalid link"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.state === "not_approved"
              ? "This application is still under review. You'll receive an email with an account link once it's approved."
              : "This account-creation link is invalid or has expired. Please use the link from your approval email."}
          </p>
          <Link href="/" className={`${buttonVariants({ variant: "outline" })} mt-6`}>
            Back to GridLink
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald/15 text-emerald">
            <BadgeCheck className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-navy">
            Welcome, {result.companyName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your application is approved. Set a password to access your verified
            vendor portal.
          </p>
        </div>
        <CreateAccountForm
          token={token}
          email={result.email}
          preview={result.state === "preview"}
        />
      </div>
    </Shell>
  )
}
