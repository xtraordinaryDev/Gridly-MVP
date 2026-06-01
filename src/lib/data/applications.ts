import "server-only"

import type { DocumentRef } from "@/lib/schemas/vendor-application"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export type ApplicationStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "info_requested"

export type ApplicationSource = "invited" | "self_applied"

export interface ApplicationDocuments {
  w9Form?: DocumentRef | null
  certificateOfInsurance?: DocumentRef | null
  distributorLicense?: DocumentRef | null
  companyLogo?: DocumentRef | null
}

export interface ApplicationDetail {
  id: string
  invitationToken: string
  status: ApplicationStatus
  source: ApplicationSource
  submittedAt: string | null
  reviewedAt: string | null

  companyName: string
  corporateAddress: string | null
  stateOfIncorporation: string | null
  entityType: string | null
  organizationType: string[]
  specialCertification: string | null
  nationwide: boolean
  usDotNumber: string | null
  websiteUrl: string | null
  yearFounded: number | null
  description: string | null
  annualGallonsRange: string | null

  salesRepFirstName: string | null
  salesRepLastName: string | null
  salesRepEmail: string | null
  salesRepPhone: string | null
  dispatchContactName: string | null
  dispatchPhone: string | null
  dispatchEmail: string | null
  emergencyDispatchName: string | null
  emergencyDispatchPhone: string | null
  emergencyDispatchEmail: string | null

  billingAddress: string | null
  billingContactName: string | null
  billingEmail: string | null
  billingPhone: string | null
  deliveryContactInfo: string | null
  billingSystem: string | null

  operatingHours: string[]
  terminalsAvailable: string | null
  pricingBasis: string | null
  pricingBasisOther: string | null
  areasOwnedTrucks: string | null
  areasSubcontracted: string | null
  tankwagonsCount: number | null
  transportsCount: number | null
  annualGallonsDistributed: number | null
  standardOrderLeadTime: string | null

  productsOffered: string[]
  brandsOffered: string | null

  emergencyRetainerWilling: string | null
  emergencyOrderLeadTime: string | null
  emergencyResponseTimes: string | null

  deliveryCapabilities: string[]
  additionalServices: string[]
  otherServices: string | null
  wetHoseTicketType: string | null
  telematicsSystem: string | null
  dispatchSoftware: string | null

  licensedStates: string[]
  documents: ApplicationDocuments
}

export interface ApplicationListItem {
  id: string
  companyName: string
  submittedAt: string | null
  source: ApplicationSource
  status: ApplicationStatus
  products: string[]
  states: string[]
}

export interface DashboardStats {
  pendingApplications: number
  verifiedVendors: number
  activeRfps: number
  buyerOrganizations: number
}

// ---------------------------------------------------------------------------
// Mock data (used in preview mode when Supabase isn't configured)
// ---------------------------------------------------------------------------
function mock(partial: Partial<ApplicationDetail> & { id: string; companyName: string }): ApplicationDetail {
  return {
    invitationToken: `tok_${partial.id}`,
    status: "pending_review",
    source: "self_applied",
    submittedAt: null,
    reviewedAt: null,
    corporateAddress: null,
    stateOfIncorporation: null,
    entityType: null,
    organizationType: [],
    specialCertification: null,
    nationwide: false,
    usDotNumber: null,
    websiteUrl: null,
    yearFounded: null,
    description: null,
    annualGallonsRange: null,
    salesRepFirstName: null,
    salesRepLastName: null,
    salesRepEmail: null,
    salesRepPhone: null,
    dispatchContactName: null,
    dispatchPhone: null,
    dispatchEmail: null,
    emergencyDispatchName: null,
    emergencyDispatchPhone: null,
    emergencyDispatchEmail: null,
    billingAddress: null,
    billingContactName: null,
    billingEmail: null,
    billingPhone: null,
    deliveryContactInfo: null,
    billingSystem: null,
    operatingHours: [],
    terminalsAvailable: null,
    pricingBasis: null,
    pricingBasisOther: null,
    areasOwnedTrucks: null,
    areasSubcontracted: null,
    tankwagonsCount: null,
    transportsCount: null,
    annualGallonsDistributed: null,
    standardOrderLeadTime: null,
    productsOffered: [],
    brandsOffered: null,
    emergencyRetainerWilling: null,
    emergencyOrderLeadTime: null,
    emergencyResponseTimes: null,
    deliveryCapabilities: [],
    additionalServices: [],
    otherServices: null,
    wetHoseTicketType: null,
    telematicsSystem: null,
    dispatchSoftware: null,
    licensedStates: [],
    documents: {},
    ...partial,
  }
}

const MOCK_APPLICATIONS: ApplicationDetail[] = [
  mock({
    id: "app-apex",
    companyName: "Apex Fuel Co.",
    source: "self_applied",
    status: "pending_review",
    submittedAt: "2026-05-28T14:30:00Z",
    corporateAddress: "1420 Industrial Pkwy, Chicago, IL 60616",
    stateOfIncorporation: "Illinois",
    entityType: "LLC",
    organizationType: ["Supplier", "Transportation/Company Trucks"],
    specialCertification: "DBE",
    nationwide: false,
    usDotNumber: "2381044",
    websiteUrl: "https://apexfuel.com",
    yearFounded: 2009,
    description:
      "Regional fuel distributor serving the Midwest with a 40-truck fleet and 24/7 emergency dispatch.",
    salesRepFirstName: "Marcus",
    salesRepLastName: "Reilly",
    salesRepEmail: "marcus@apexfuel.com",
    salesRepPhone: "(312) 555-0142",
    dispatchContactName: "Dana Whitfield",
    dispatchPhone: "(312) 555-0148",
    dispatchEmail: "dispatch@apexfuel.com",
    emergencyDispatchName: "Dana Whitfield",
    emergencyDispatchPhone: "(312) 555-0199",
    emergencyDispatchEmail: "emergency@apexfuel.com",
    billingAddress: "1420 Industrial Pkwy, Chicago, IL 60616",
    billingContactName: "Priya Nair",
    billingEmail: "ar@apexfuel.com",
    billingPhone: "(312) 555-0151",
    billingSystem: "NetSuite",
    operatingHours: ["Open weekends extra charge", "Closed holidays"],
    pricingBasis: "OPIS GCA 10am",
    tankwagonsCount: 12,
    transportsCount: 28,
    annualGallonsDistributed: 48000000,
    standardOrderLeadTime: "24–48 hours",
    productsOffered: ["Diesel", "Dyed Diesel", "DEF", "Gas", "Premium Gas"],
    brandsOffered: "Shell Rotella, Chevron",
    emergencyRetainerWilling: "Yes",
    emergencyOrderLeadTime: "4 hours",
    emergencyResponseTimes:
      "2–4 hours metro, 6 hours regional. Emergency premium $0.15/gal.",
    deliveryCapabilities: [
      "Wet-hose/Mobile Refueling",
      "Provide delivery tickets within 24 hours",
      "Install Tank Monitors",
    ],
    additionalServices: [
      "Utilize dispatch/scheduling software",
      "Able to integrate through API or other forms of integration",
    ],
    telematicsSystem: "Samsara",
    dispatchSoftware: "TankScan + custom dispatch",
    licensedStates: ["Illinois", "Indiana", "Wisconsin", "Iowa", "Missouri"],
    documents: {
      w9Form: { path: "app-apex/w9/w9-apex.pdf", name: "W9-Apex-2026.pdf", size: 184320 },
      certificateOfInsurance: {
        path: "app-apex/coi/coi-apex.pdf",
        name: "COI-Apex-2026.pdf",
        size: 256000,
      },
      distributorLicense: {
        path: "app-apex/distributor_license/license.pdf",
        name: "IL-Distributor-License.pdf",
        size: 98304,
      },
    },
  }),
  mock({
    id: "app-heartland",
    companyName: "Heartland Energy Partners",
    source: "invited",
    status: "pending_review",
    submittedAt: "2026-05-27T09:10:00Z",
    stateOfIncorporation: "Iowa",
    entityType: "Corporation",
    organizationType: ["Supplier"],
    nationwide: false,
    websiteUrl: "https://heartlandenergy.com",
    yearFounded: 1998,
    salesRepFirstName: "Karen",
    salesRepLastName: "Bauer",
    salesRepEmail: "kbauer@heartlandenergy.com",
    salesRepPhone: "(515) 555-0110",
    productsOffered: ["Diesel", "Bio-Diesel", "Renewable Fuel", "DEF"],
    annualGallonsDistributed: 72000000,
    licensedStates: ["Iowa", "Nebraska", "Minnesota", "South Dakota"],
    documents: {
      w9Form: { path: "app-heartland/w9/w9.pdf", name: "Heartland-W9.pdf", size: 165000 },
      certificateOfInsurance: {
        path: "app-heartland/coi/coi.pdf",
        name: "Heartland-COI.pdf",
        size: 240000,
      },
    },
  }),
  mock({
    id: "app-summit",
    companyName: "Summit Petroleum LLC",
    source: "self_applied",
    status: "info_requested",
    submittedAt: "2026-05-25T16:45:00Z",
    reviewedAt: "2026-05-26T11:00:00Z",
    stateOfIncorporation: "Colorado",
    entityType: "LLC",
    organizationType: ["Broker", "Supplier"],
    nationwide: true,
    salesRepFirstName: "Trevor",
    salesRepLastName: "Hughes",
    salesRepEmail: "trevor@summitpetro.com",
    salesRepPhone: "(720) 555-0190",
    productsOffered: ["Gas", "Diesel", "Jet Fuel", "Propane"],
    annualGallonsDistributed: 120000000,
    licensedStates: ["Colorado", "Utah", "Wyoming", "New Mexico", "Arizona"],
    documents: {
      certificateOfInsurance: {
        path: "app-summit/coi/coi.pdf",
        name: "Summit-COI.pdf",
        size: 210000,
      },
    },
  }),
  mock({
    id: "app-gulfstream",
    companyName: "Gulfstream Fuels",
    source: "invited",
    status: "approved",
    submittedAt: "2026-05-20T13:00:00Z",
    reviewedAt: "2026-05-23T10:30:00Z",
    stateOfIncorporation: "Texas",
    entityType: "Corporation",
    organizationType: ["Supplier", "Transportation/Company Trucks"],
    salesRepFirstName: "Lucia",
    salesRepLastName: "Morales",
    salesRepEmail: "lucia@gulfstreamfuels.com",
    salesRepPhone: "(713) 555-0177",
    productsOffered: ["Diesel", "Marine Fuel", "DEF", "Gas"],
    annualGallonsDistributed: 95000000,
    licensedStates: ["Texas", "Louisiana", "Oklahoma"],
    documents: {
      w9Form: { path: "app-gulfstream/w9/w9.pdf", name: "Gulfstream-W9.pdf", size: 170000 },
      certificateOfInsurance: {
        path: "app-gulfstream/coi/coi.pdf",
        name: "Gulfstream-COI.pdf",
        size: 250000,
      },
    },
  }),
  mock({
    id: "app-northway",
    companyName: "Northway Diesel Supply",
    source: "self_applied",
    status: "rejected",
    submittedAt: "2026-05-18T08:20:00Z",
    reviewedAt: "2026-05-19T15:00:00Z",
    stateOfIncorporation: "Michigan",
    entityType: "Sole Proprietorship",
    organizationType: ["Transportation/Company Trucks"],
    salesRepFirstName: "Glen",
    salesRepLastName: "Porter",
    salesRepEmail: "glen@northwaydiesel.com",
    salesRepPhone: "(231) 555-0133",
    productsOffered: ["Diesel"],
    annualGallonsDistributed: 800000,
    licensedStates: ["Michigan"],
    documents: {},
  }),
  mock({
    id: "app-coastal",
    companyName: "Coastal Energy Logistics",
    source: "invited",
    status: "pending_review",
    submittedAt: "2026-05-29T12:00:00Z",
    stateOfIncorporation: "Florida",
    entityType: "LLC",
    organizationType: ["Supplier"],
    salesRepFirstName: "Renee",
    salesRepLastName: "Alvarez",
    salesRepEmail: "renee@coastalenergy.com",
    salesRepPhone: "(305) 555-0166",
    productsOffered: ["Diesel", "Gas", "Marine Fuel", "DEF", "Kerosene"],
    annualGallonsDistributed: 33000000,
    licensedStates: ["Florida", "Georgia", "Alabama", "South Carolina"],
    documents: {
      w9Form: { path: "app-coastal/w9/w9.pdf", name: "Coastal-W9.pdf", size: 158000 },
      certificateOfInsurance: {
        path: "app-coastal/coi/coi.pdf",
        name: "Coastal-COI.pdf",
        size: 230000,
      },
    },
  }),
]

// ---------------------------------------------------------------------------
// Row mapping (Supabase → ApplicationDetail)
// ---------------------------------------------------------------------------
function rowToDetail(row: Record<string, unknown>): ApplicationDetail {
  const s = (v: unknown) => (typeof v === "string" ? v : null)
  const n = (v: unknown) => (typeof v === "number" ? v : null)
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])

  return {
    id: row.id as string,
    invitationToken: (row.invitation_token as string) ?? "",
    status: (row.status as ApplicationStatus) ?? "pending_review",
    source: (row.source as ApplicationSource) ?? "self_applied",
    submittedAt: s(row.submitted_at),
    reviewedAt: s(row.reviewed_at),
    companyName: (row.company_name as string) ?? "Unknown",
    corporateAddress: s(row.corporate_address),
    stateOfIncorporation: s(row.state_of_incorporation),
    entityType: s(row.entity_type),
    organizationType: arr(row.organization_type),
    specialCertification: s(row.special_certification),
    nationwide: Boolean(row.nationwide),
    usDotNumber: s(row.us_dot_number),
    websiteUrl: s(row.website_url),
    yearFounded: n(row.year_founded),
    description: s(row.description),
    annualGallonsRange: s(row.annual_gallons_range),
    salesRepFirstName: s(row.sales_rep_first_name),
    salesRepLastName: s(row.sales_rep_last_name),
    salesRepEmail: s(row.sales_rep_email),
    salesRepPhone: s(row.sales_rep_phone),
    dispatchContactName: s(row.dispatch_contact_name),
    dispatchPhone: s(row.dispatch_phone),
    dispatchEmail: s(row.dispatch_email),
    emergencyDispatchName: s(row.emergency_dispatch_name),
    emergencyDispatchPhone: s(row.emergency_dispatch_phone),
    emergencyDispatchEmail: s(row.emergency_dispatch_email),
    billingAddress: s(row.billing_address),
    billingContactName: s(row.billing_contact_name),
    billingEmail: s(row.billing_email),
    billingPhone: s(row.billing_phone),
    deliveryContactInfo: s(row.delivery_contact_info),
    billingSystem: s(row.billing_system),
    operatingHours: arr(row.operating_hours),
    terminalsAvailable: s(row.terminals_available),
    pricingBasis: s(row.pricing_basis),
    pricingBasisOther: s(row.pricing_basis_other),
    areasOwnedTrucks: s(row.areas_owned_trucks),
    areasSubcontracted: s(row.areas_subcontracted),
    tankwagonsCount: n(row.tankwagons_count),
    transportsCount: n(row.transports_count),
    annualGallonsDistributed: n(row.annual_gallons_distributed),
    standardOrderLeadTime: s(row.standard_order_lead_time),
    productsOffered: arr(row.products_offered),
    brandsOffered: s(row.brands_offered),
    emergencyRetainerWilling: s(row.emergency_retainer_willing),
    emergencyOrderLeadTime: s(row.emergency_order_lead_time),
    emergencyResponseTimes: s(row.emergency_response_times),
    deliveryCapabilities: arr(row.delivery_capabilities),
    additionalServices: arr(row.additional_services),
    otherServices: s(row.other_services),
    wetHoseTicketType: s(row.wet_hose_ticket_type),
    telematicsSystem: s(row.telematics_system),
    dispatchSoftware: s(row.dispatch_software),
    licensedStates: arr(row.licensed_states),
    documents: (row.documents as ApplicationDocuments) ?? {},
  }
}

const toListItem = (a: ApplicationDetail): ApplicationListItem => ({
  id: a.id,
  companyName: a.companyName,
  submittedAt: a.submittedAt,
  source: a.source,
  status: a.status,
  products: a.productsOffered,
  states: a.licensedStates,
})

// ---------------------------------------------------------------------------
// Public data accessors
// ---------------------------------------------------------------------------
export async function listApplications(): Promise<ApplicationListItem[]> {
  if (!isSupabaseConfigured()) {
    return [...MOCK_APPLICATIONS]
      .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))
      .map(toListItem)
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("vendor_applications")
    .select("*")
    .order("submitted_at", { ascending: false, nullsFirst: false })

  if (error || !data) return []
  return data.map((row) => toListItem(rowToDetail(row)))
}

export async function getApplication(
  id: string
): Promise<ApplicationDetail | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_APPLICATIONS.find((a) => a.id === id) ?? null
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("vendor_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  return rowToDetail(data)
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured()) {
    return {
      pendingApplications: MOCK_APPLICATIONS.filter(
        (a) => a.status === "pending_review"
      ).length,
      verifiedVendors: 1,
      activeRfps: 3,
      buyerOrganizations: 5,
    }
  }

  const supabase = createAdminClient()
  const [pending, vendors, rfps, buyers] = await Promise.all([
    supabase
      .from("vendor_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", true),
    supabase
      .from("rfps")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("buyer_organizations")
      .select("id", { count: "exact", head: true }),
  ])

  return {
    pendingApplications: pending.count ?? 0,
    verifiedVendors: vendors.count ?? 0,
    activeRfps: rfps.count ?? 0,
    buyerOrganizations: buyers.count ?? 0,
  }
}
