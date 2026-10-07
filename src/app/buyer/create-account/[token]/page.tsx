import type { Metadata } from "next"
import Link from "next/link"
import { GridLinkLogo } from "@/components/brand/logo"
import { AlertTriangle, Building2, CheckCircle2 } from "lucide-react"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { accountExists } from "@/lib/forms/public-form"
import { buttonVariants } from "@/components/ui/button"
import { CreateAccountForm } from "./create-account-form"

export const metadata: Metadata = {
  title: "Create your account — GridLink",
  robots: { index: false, follow: false },
}

type LoadResult =
  | { state: "ok" | "preview"; email: string; companyName: string }
  | { state: "invalid" }
  | { state: "rejected" }
  | { state: "not_approved" }
  | { state: "used" }

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
  if (data.status === "rejected") return { state: "rejected" }
  if (data.status !== "approved") return { state: "not_approved" }

  // The link works once: after the account exists it only points at sign-in.
  if (data.email && (await accountExists(supabase, data.email as string))) return { state: "used" }

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
          <GridLinkLogo />
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

  if (result.state === "used") {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald/15 text-emerald">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-navy">This account has already been created</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This link has already been used to set up your account. Sign in to continue, or reset
            your password if you&apos;ve forgotten it.
          </p>
          <Link href="/login" className={`${buttonVariants()} mt-6 w-full`}>
            Sign in
          </Link>
          <Link href="/forgot-password" className="mt-3 block text-sm font-medium text-brand-blue hover:underline">
            Forgot your password?
          </Link>
        </div>
      </Shell>
    )
  }

  if (result.state === "invalid" || result.state === "not_approved" || result.state === "rejected") {
    const copy = {
      invalid: {
        title: "Invalid link",
        body: "This account-creation link is invalid or has expired. Please use the link from your approval email.",
      },
      not_approved: {
        title: "Not approved yet",
        body: "This request is still under review. You'll receive an email with an account link once it's approved.",
      },
      rejected: {
        title: "This request was not approved",
        body: "We reviewed this request and weren't able to approve it, so an account can't be created from this link. If you think that's a mistake, reply to the email we sent you.",
      },
    }[result.state]
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-navy">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
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
