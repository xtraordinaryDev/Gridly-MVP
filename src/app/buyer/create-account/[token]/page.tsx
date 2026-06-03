import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, Building2, Zap } from "lucide-react"

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
      email: "procurement@metrotransit.example.com",
      companyName: "Metro Transit Authority",
    }
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("buyer_applications")
    .select("status, company_name, email")
    .eq("invitation_token", token)
    .maybeSingle()

  if (!data) return { state: "invalid" }
  if (data.status !== "approved") return { state: "not_approved" }

  return {
    state: "ok",
    email: (data.email as string) ?? "",
    companyName: (data.company_name as string) ?? "your organization",
  }
}

function Shell({ children }: { children: React.ReactNode }) {
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
        {children}
      </div>
    </main>
  )
}

export default async function CreateBuyerAccountPage({
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
            {result.state === "not_approved" ? "Not approved yet" : "Invalid link"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.state === "not_approved"
              ? "This request is still under review. You'll receive an email with an account link once it's approved."
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
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
            <Building2 className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-navy">Welcome, {result.companyName}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your access request is approved. Set a password to access your buyer dashboard.
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
