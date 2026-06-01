import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, BadgeCheck } from "lucide-react"

import type { VendorRegistration } from "@/lib/schemas/vendor-application"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { RegistrationForm } from "./registration-form"

export const metadata: Metadata = {
  title: "Vendor Registration — GridLink",
  robots: { index: false, follow: false },
}

const VALID_STATUSES = ["pending_review", "info_requested"]

type LoadResult =
  | { state: "ok"; applicationId: string; initialData: Partial<VendorRegistration> }
  | { state: "preview"; applicationId: string }
  | { state: "invalid" }

function rowToInitialData(
  row: Record<string, unknown>
): Partial<VendorRegistration> {
  const s = (v: unknown) => (typeof v === "string" ? v : undefined)
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : undefined)

  return {
    companyName: s(row.company_name),
    corporateAddress: s(row.corporate_address),
    stateOfIncorporation: s(row.state_of_incorporation),
    organizationType: arr(row.organization_type) as never,
    nationwide: typeof row.nationwide === "boolean" ? row.nationwide : undefined,
    usDotNumber: s(row.us_dot_number),
    websiteUrl: s(row.website_url),
    yearFounded:
      typeof row.year_founded === "number" ? row.year_founded : undefined,
    salesRepFirstName: s(row.sales_rep_first_name),
    salesRepLastName: s(row.sales_rep_last_name),
    salesRepEmail: s(row.sales_rep_email),
    salesRepPhone: s(row.sales_rep_phone),
    dispatchContactName: s(row.dispatch_contact_name),
    dispatchPhone: s(row.dispatch_phone),
    dispatchEmail: s(row.dispatch_email),
    billingAddress: s(row.billing_address),
    billingContactName: s(row.billing_contact_name),
    billingEmail: s(row.billing_email),
    billingPhone: s(row.billing_phone),
    productsOffered: arr(row.products_offered) as never,
    licensedStates: arr(row.licensed_states) as never,
  }
}

async function loadApplication(token: string): Promise<LoadResult> {
  if (!isSupabaseConfigured()) {
    // Preview mode — let the form render without a backing row.
    return { state: "preview", applicationId: `preview-${token}` }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("vendor_applications")
      .select("*")
      .eq("invitation_token", token)
      .maybeSingle()

    if (error || !data) return { state: "invalid" }
    if (!VALID_STATUSES.includes(data.status as string)) {
      return { state: "invalid" }
    }

    return {
      state: "ok",
      applicationId: data.id as string,
      initialData: rowToInitialData(data),
    }
  } catch {
    return { state: "invalid" }
  }
}

export default async function VendorRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await loadApplication(token)

  if (result.state === "invalid") {
    return (
      <>
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center bg-accent/30 px-4 py-24">
          <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </span>
            <h1 className="mt-5 text-2xl font-bold text-navy">
              This link is no longer valid
            </h1>
            <p className="mt-3 text-muted-foreground">
              Your registration link may have expired or already been
              submitted. Please reach out to the GridLink team for a new
              invitation.
            </p>
            <Link
              href="/become-a-supplier"
              className={`${buttonVariants({ variant: "outline" })} mt-6`}
            >
              Apply to become a supplier
            </Link>
          </div>
        </main>
        <SiteFooter />
      </>
    )
  }

  const applicationId = result.applicationId
  const initialData =
    result.state === "ok" ? result.initialData : undefined

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-accent/20">
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-8 text-center">
            <Badge className="mb-4 gap-1.5 rounded-full bg-emerald/15 text-emerald">
              <BadgeCheck className="size-3.5" />
              GridLink Verified Application
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Vendor Profile
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Complete your verification profile below. Your progress is saved
              automatically — you can close this tab and return any time using
              the same link.
            </p>
            {result.state === "preview" ? (
              <p className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Preview mode: Supabase isn&apos;t configured yet, so uploads and
                submission are simulated.
              </p>
            ) : null}
          </div>

          <RegistrationForm
            token={token}
            applicationId={applicationId}
            previewMode={result.state === "preview"}
            initialData={initialData}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
