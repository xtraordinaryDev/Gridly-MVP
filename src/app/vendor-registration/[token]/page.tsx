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
import { normalizeRegistration } from "./normalize"

export const metadata: Metadata = {
  title: "Vendor Registration — GridLink",
  robots: { index: false, follow: false },
}

const VALID_STATUSES = ["pending_review", "info_requested"]

type LoadResult =
  | { state: "ok"; initialData: Partial<VendorRegistration>; returning: boolean; infoRequest: string | null }
  | { state: "preview" }
  | { state: "invalid" }

/**
 * Everything the form collects, read back from the application row, so a
 * supplier returning on another device (or after "more info requested") sees
 * what they already submitted — not just the interest-form basics.
 */
function rowToInitialData(row: Record<string, unknown>): Partial<VendorRegistration> {
  const documents = (row.documents as Record<string, unknown> | null) ?? {}
  return normalizeRegistration({
    companyName: row.company_name,
    corporateAddress: row.corporate_address,
    stateOfIncorporation: row.state_of_incorporation,
    entityType: row.entity_type,
    organizationType: row.organization_type,
    specialCertification: row.special_certification,
    // The column defaults to false; only trust it once the full form has been submitted.
    nationwide: row.submitted_at && row.entity_type ? row.nationwide : undefined,
    usDotNumber: row.us_dot_number,
    websiteUrl: row.website_url,
    yearFounded: row.year_founded,

    w9Form: documents.w9Form,
    certificateOfInsurance: documents.certificateOfInsurance,
    distributorLicense: documents.distributorLicense,
    companyLogo: documents.companyLogo,

    salesRepFirstName: row.sales_rep_first_name,
    salesRepLastName: row.sales_rep_last_name,
    salesRepEmail: row.sales_rep_email,
    salesRepPhone: row.sales_rep_phone,
    dispatchContactName: row.dispatch_contact_name,
    dispatchPhone: row.dispatch_phone,
    dispatchEmail: row.dispatch_email,
    emergencyDispatchName: row.emergency_dispatch_name,
    emergencyDispatchPhone: row.emergency_dispatch_phone,
    emergencyDispatchEmail: row.emergency_dispatch_email,

    billingAddress: row.billing_address,
    billingContactName: row.billing_contact_name,
    billingEmail: row.billing_email,
    billingPhone: row.billing_phone,
    deliveryContactInfo: row.delivery_contact_info,
    billingSystem: row.billing_system,

    operatingHours: row.operating_hours,
    terminalsAvailable: row.terminals_available,
    pricingBasis: row.pricing_basis,
    pricingBasisOther: row.pricing_basis_other,
    areasOwnedTrucks: row.areas_owned_trucks,
    areasSubcontracted: row.areas_subcontracted,
    tankwagonsCount: row.tankwagons_count,
    transportsCount: row.transports_count,
    annualGallonsDistributed: row.annual_gallons_distributed,
    standardOrderLeadTime: row.standard_order_lead_time,

    productsOffered: row.products_offered,
    brandsOffered: row.brands_offered,

    emergencyRetainerWilling: row.emergency_retainer_willing,
    emergencyOrderLeadTime: row.emergency_order_lead_time,
    emergencyResponseTimes: row.emergency_response_times,

    deliveryCapabilities: row.delivery_capabilities,
    additionalServices: row.additional_services,
    otherServices: row.other_services,
    wetHoseTicketType: row.wet_hose_ticket_type,
    telematicsSystem: row.telematics_system,
    dispatchSoftware: row.dispatch_software,

    licensedStates: row.licensed_states,
  })
}

async function loadApplication(token: string): Promise<LoadResult> {
  if (!isSupabaseConfigured()) {
    // Preview mode — let the form render without a backing row.
    return { state: "preview" }
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

    // What the reviewer asked for, shown above the form when they sent it back.
    let infoRequest: string | null = null
    if (data.status === "info_requested") {
      const { data: note } = await supabase
        .from("application_activity_log")
        .select("notes")
        .eq("application_id", data.id as string)
        .eq("action", "info_requested")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      infoRequest = ((note?.notes as string | null) ?? "").trim() || null
    }

    const initialData = rowToInitialData(data)
    return {
      state: "ok",
      initialData,
      // A full profile is already on file (documents only arrive with the full form).
      returning: Boolean(initialData.w9Form && initialData.certificateOfInsurance),
      infoRequest,
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
              in this browser as you go — come back on the same device to
              continue. Once you submit, it&apos;s saved to your application.
            </p>
            {result.state === "preview" ? (
              <p className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Preview mode: Supabase isn&apos;t configured yet, so uploads and
                submission are simulated.
              </p>
            ) : null}
          </div>

          {result.state === "ok" && (result.infoRequest || result.returning) ? (
            <div className="mb-6 rounded-2xl border border-amber-300/70 bg-amber-50 p-5 text-sm text-amber-900">
              {result.infoRequest ? (
                <>
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="size-4 shrink-0" />
                    The GridLink team asked for more information
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words">{result.infoRequest}</p>
                  <p className="mt-3 text-xs text-amber-800">
                    Your earlier answers are filled in below. Update what&apos;s needed, then submit again from the Review step.
                  </p>
                </>
              ) : (
                <p>
                  We already have a profile on file for you. Your earlier answers are filled in below — change anything
                  you need to and submit again from the Review step.
                </p>
              )}
            </div>
          ) : null}

          <RegistrationForm
            token={token}
            previewMode={result.state === "preview"}
            initialData={initialData}
            returning={result.state === "ok" && result.returning}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
