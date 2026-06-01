"use server"

import {
  VendorRegistrationSchema,
  type VendorRegistration,
} from "@/lib/schemas/vendor-application"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { sendEmail } from "@/lib/email"

export type SubmitRegistrationResult =
  | { ok: true }
  | { ok: false; message: string }

const VALID_STATUSES = ["pending_review", "info_requested"]

function toColumns(data: VendorRegistration) {
  return {
    company_name: data.companyName,
    corporate_address: data.corporateAddress,
    state_of_incorporation: data.stateOfIncorporation,
    entity_type: data.entityType,
    organization_type: data.organizationType,
    special_certification: data.specialCertification ?? null,
    nationwide: data.nationwide,
    us_dot_number: data.usDotNumber || null,
    website_url: data.websiteUrl || null,
    year_founded: data.yearFounded ?? null,

    sales_rep_first_name: data.salesRepFirstName,
    sales_rep_last_name: data.salesRepLastName,
    sales_rep_email: data.salesRepEmail,
    sales_rep_phone: data.salesRepPhone,

    dispatch_contact_name: data.dispatchContactName,
    dispatch_phone: data.dispatchPhone,
    dispatch_email: data.dispatchEmail,

    emergency_dispatch_name: data.emergencyDispatchName,
    emergency_dispatch_phone: data.emergencyDispatchPhone,
    emergency_dispatch_email: data.emergencyDispatchEmail,

    billing_address: data.billingAddress,
    billing_contact_name: data.billingContactName,
    billing_email: data.billingEmail,
    billing_phone: data.billingPhone,
    delivery_contact_info: data.deliveryContactInfo || null,
    billing_system: data.billingSystem || null,

    operating_hours: data.operatingHours,
    terminals_available: data.terminalsAvailable || null,
    pricing_basis: data.pricingBasis,
    pricing_basis_other: data.pricingBasisOther || null,
    areas_owned_trucks: data.areasOwnedTrucks || null,
    areas_subcontracted: data.areasSubcontracted || null,
    tankwagons_count: data.tankwagonsCount,
    transports_count: data.transportsCount,
    annual_gallons_distributed: data.annualGallonsDistributed,
    standard_order_lead_time: data.standardOrderLeadTime,

    products_offered: data.productsOffered,
    brands_offered: data.brandsOffered || null,

    emergency_retainer_willing: data.emergencyRetainerWilling,
    emergency_order_lead_time: data.emergencyOrderLeadTime,
    emergency_response_times: data.emergencyResponseTimes,

    delivery_capabilities: data.deliveryCapabilities,
    additional_services: data.additionalServices,
    other_services: data.otherServices || null,
    wet_hose_ticket_type: data.wetHoseTicketType || null,
    telematics_system: data.telematicsSystem || null,
    dispatch_software: data.dispatchSoftware || null,

    licensed_states: data.licensedStates,

    documents: {
      w9Form: data.w9Form,
      certificateOfInsurance: data.certificateOfInsurance,
      distributorLicense: data.distributorLicense ?? null,
      companyLogo: data.companyLogo ?? null,
    },

    status: "pending_review" as const,
    submitted_at: new Date().toISOString(),
  }
}

export async function submitVendorRegistration(
  token: string,
  values: unknown
): Promise<SubmitRegistrationResult> {
  const parsed = VendorRegistrationSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some fields need attention. Please review and try again.",
    }
  }

  // Preview mode (no Supabase configured) — simulate a successful submit.
  if (!isSupabaseConfigured()) {
    return { ok: true }
  }

  try {
    const supabase = createAdminClient()

    const { data: application, error: lookupError } = await supabase
      .from("vendor_applications")
      .select("id,status")
      .eq("invitation_token", token)
      .maybeSingle()

    if (lookupError || !application) {
      return { ok: false, message: "This registration link is no longer valid." }
    }

    if (!VALID_STATUSES.includes(application.status as string)) {
      return {
        ok: false,
        message: "This application has already been submitted.",
      }
    }

    const { error: updateError } = await supabase
      .from("vendor_applications")
      .update(toColumns(parsed.data))
      .eq("id", application.id)

    if (updateError) {
      console.error("Failed to update vendor application:", updateError.message)
      return { ok: false, message: "We couldn't submit your profile. Please try again." }
    }

    await sendEmail({
      to: parsed.data.salesRepEmail,
      template: "vendor-application-received",
      data: {
        contactName: parsed.data.salesRepFirstName,
        companyName: parsed.data.companyName,
      },
    })

    return { ok: true }
  } catch (err) {
    console.error("Vendor registration submission error:", err)
    return {
      ok: false,
      message: "Submissions aren't available right now. Please try again shortly.",
    }
  }
}
