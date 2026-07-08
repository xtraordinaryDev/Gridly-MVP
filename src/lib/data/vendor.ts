import "server-only"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import {
  getVendorOpportunityDetail,
  listVendorOpportunities,
  resolveVendorIdForSession,
} from "@/lib/data/rfps"
import type { InvitationStatus } from "@/lib/rfp/types"

export type OpportunityStatus = "new" | "viewed" | "responded" | "declined"

export interface VendorProfile {
  id: string
  profileId: string | null
  companyName: string
  email: string | null
  isVerified: boolean
  verifiedAt: string | null

  website: string | null
  corporateAddress: string | null
  stateOfIncorporation: string | null
  entityType: string | null
  organizationType: string[]
  specialCertification: string | null
  usDotNumber: string | null
  yearFounded: number | null
  description: string | null

  productsOffered: string[]
  brandsOffered: string | null
  deliveryCapabilities: string[]
  additionalServices: string[]
  licensedStates: string[]

  tankwagonsCount: number | null
  transportsCount: number | null
  annualGallonsDistributed: number | null
  standardOrderLeadTime: string | null
}

export interface Opportunity {
  id: string
  buyer: string
  title: string
  fuelType: string
  quantityGallons: number
  states: string[]
  dueDate: string
  status: OpportunityStatus
  emergency?: boolean
}

export interface ActivityEvent {
  id: string
  type: "verified" | "invited" | "submitted" | "viewed"
  label: string
  date: string
}

export interface NotificationPrefs {
  emailFrequency: "daily" | "weekly" | "never"
  fuelTypes: string[]
  states: string[]
  minGallons: number
  emergencyImmediate: boolean
}

export interface VendorDashboardStats {
  newOpportunitiesThisWeek: number
  activeRfpInvites: number
  bidsSubmittedYtd: number
  profileCompleteness: number
}

// ---------------------------------------------------------------------------
// Mock data (preview mode)
// ---------------------------------------------------------------------------
const MOCK_VENDOR: VendorProfile = {
  id: "vendor-apex",
  profileId: "preview-vendor",
  companyName: "Apex Fuel Co.",
  email: "marcus@apexfuel.com",
  isVerified: true,
  verifiedAt: "2026-05-23T10:30:00Z",
  website: "https://apexfuel.com",
  corporateAddress: "1420 Industrial Pkwy, Chicago, IL 60616",
  stateOfIncorporation: "Illinois",
  entityType: "LLC",
  organizationType: ["Supplier", "Transportation/Company Trucks"],
  specialCertification: "DBE",
  usDotNumber: "2381044",
  yearFounded: 2009,
  description:
    "Regional fuel distributor serving the Midwest with a 40-truck fleet and 24/7 emergency dispatch.",
  productsOffered: ["Diesel", "Dyed Diesel", "DEF", "Gas", "Premium Gas"],
  brandsOffered: "Shell Rotella, Chevron",
  deliveryCapabilities: [
    "Wet-hose/Mobile Refueling",
    "Provide delivery tickets within 24 hours",
    "Install Tank Monitors",
  ],
  additionalServices: [
    "Utilize dispatch/scheduling software",
    "Able to integrate through API or other forms of integration",
  ],
  licensedStates: ["Illinois", "Indiana", "Wisconsin", "Iowa", "Missouri"],
  tankwagonsCount: 12,
  transportsCount: 28,
  annualGallonsDistributed: 48000000,
  standardOrderLeadTime: "24–48 hours",
}

const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: "rfp-metcouncil",
    buyer: "Metropolitan Council",
    title: "Bulk Diesel & DEF — Transit Fleet FY27",
    fuelType: "Diesel, DEF",
    quantityGallons: 2400000,
    states: ["Minnesota"],
    dueDate: "2026-06-15",
    status: "new",
  },
  {
    id: "rfp-citychicago",
    buyer: "City of Chicago — Fleet Mgmt",
    title: "Unleaded & Premium Gasoline Supply",
    fuelType: "Gas, Premium Gas",
    quantityGallons: 1800000,
    states: ["Illinois"],
    dueDate: "2026-06-09",
    status: "new",
  },
  {
    id: "rfp-emergency",
    buyer: "Iowa DOT — District 4",
    title: "EMERGENCY: Storm Response Dyed Diesel",
    fuelType: "Dyed Diesel",
    quantityGallons: 350000,
    states: ["Iowa"],
    dueDate: "2026-06-03",
    status: "viewed",
    emergency: true,
  },
  {
    id: "rfp-schooldist",
    buyer: "Wisconsin Unified School Dist.",
    title: "Heating Oil & Diesel — Annual Contract",
    fuelType: "Diesel, Heating Oil",
    quantityGallons: 920000,
    states: ["Wisconsin"],
    dueDate: "2026-06-22",
    status: "responded",
  },
  {
    id: "rfp-portauth",
    buyer: "Indiana Port Authority",
    title: "Marine & On-Road Diesel — Q3",
    fuelType: "Diesel, Marine Fuel",
    quantityGallons: 640000,
    states: ["Indiana"],
    dueDate: "2026-07-01",
    status: "new",
  },
]

const MOCK_ACTIVITY: ActivityEvent[] = [
  {
    id: "a0a",
    type: "invited",
    label: "Invited to “RUSH: Peaker Plant Fuel Oil — July Heat Event” by Northern States Power",
    date: "2026-07-05T07:45:00Z",
  },
  {
    id: "a0b",
    type: "viewed",
    label: "Viewed “DEF Supply — Regional Distribution Hubs”",
    date: "2026-07-03T09:00:00Z",
  },
  {
    id: "a0c",
    type: "invited",
    label: "Invited to “Backup Generator Diesel — 14 Hospital Campuses” by Mercy Health Network",
    date: "2026-06-30T14:00:00Z",
  },
  {
    id: "a0d",
    type: "viewed",
    label: "Viewed “Jet Fuel & Ground Fleet Diesel — FY27”",
    date: "2026-06-29T08:15:00Z",
  },
  {
    id: "a1",
    type: "submitted",
    label: "Submitted bid for “Heating Oil & Diesel — Annual Contract”",
    date: "2026-05-30T15:20:00Z",
  },
  {
    id: "a2",
    type: "viewed",
    label: "Viewed “EMERGENCY: Storm Response Dyed Diesel”",
    date: "2026-05-29T09:05:00Z",
  },
  {
    id: "a3",
    type: "invited",
    label: "Invited to “Bulk Diesel & DEF — Transit Fleet FY27” by Metropolitan Council",
    date: "2026-05-28T11:40:00Z",
  },
  {
    id: "a4",
    type: "verified",
    label: "GridLink Verified — application approved",
    date: "2026-05-23T10:30:00Z",
  },
]

const DEFAULT_PREFS: NotificationPrefs = {
  emailFrequency: "daily",
  fuelTypes: ["Diesel", "Dyed Diesel", "DEF", "Gas"],
  states: ["Illinois", "Indiana", "Wisconsin", "Iowa", "Missouri"],
  minGallons: 50000,
  emergencyImmediate: true,
}

// ---------------------------------------------------------------------------
// Profile completeness (shared heuristic)
// ---------------------------------------------------------------------------
export function profileCompleteness(v: VendorProfile): number {
  const checks = [
    !!v.companyName,
    !!v.corporateAddress,
    !!v.entityType,
    !!v.website,
    !!v.description,
    !!v.usDotNumber,
    v.productsOffered.length > 0,
    v.licensedStates.length > 0,
    v.deliveryCapabilities.length > 0,
    !!v.annualGallonsDistributed,
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

function rowToVendor(row: Record<string, unknown>): VendorProfile {
  const s = (v: unknown) => (typeof v === "string" ? v : null)
  const n = (v: unknown) => (typeof v === "number" ? v : null)
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])
  return {
    id: row.id as string,
    profileId: s(row.profile_id),
    companyName: (row.company_name as string) ?? "",
    email: null,
    isVerified: Boolean(row.is_verified),
    verifiedAt: s(row.verified_at),
    website: s(row.website_url),
    corporateAddress: s(row.corporate_address),
    stateOfIncorporation: s(row.state_of_incorporation),
    entityType: s(row.entity_type),
    organizationType: arr(row.organization_type),
    specialCertification: s(row.special_certification),
    usDotNumber: s(row.us_dot_number),
    yearFounded: n(row.year_founded),
    description: s(row.description),
    productsOffered: arr(row.products_offered),
    brandsOffered: s(row.brands_offered),
    deliveryCapabilities: arr(row.delivery_capabilities),
    additionalServices: arr(row.additional_services),
    licensedStates: arr(row.licensed_states),
    tankwagonsCount: n(row.tankwagons_count),
    transportsCount: n(row.transports_count),
    annualGallonsDistributed: n(row.annual_gallons_distributed),
    standardOrderLeadTime: s(row.standard_order_lead_time),
  }
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------
export async function getCurrentVendor(): Promise<VendorProfile | null> {
  if (!isSupabaseConfigured()) return MOCK_VENDOR

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle()

  if (!data) return null
  const vendor = rowToVendor(data)
  vendor.email = user.email ?? null
  return vendor
}

function mapInvitationStatus(s: InvitationStatus): OpportunityStatus {
  if (s === "invited") return "new"
  return s
}

export async function getOpportunities(): Promise<Opportunity[]> {
  const vendor = await getCurrentVendor()
  const vendorId = vendor?.id ?? "vendor-apex"
  const preview = !isSupabaseConfigured()
  const resolvedId = await resolveVendorIdForSession(
    vendor?.profileId ?? "preview-vendor",
    preview
  )
  const items = await listVendorOpportunities(resolvedId || vendorId)
  return items.map((o) => ({
    id: o.id,
    buyer: o.buyer,
    title: o.title,
    fuelType: o.fuelType,
    quantityGallons: o.quantityGallons,
    states: o.states,
    dueDate: o.dueDate,
    status: mapInvitationStatus(o.status),
    emergency: o.urgency === "emergency",
  }))
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const vendor = await getCurrentVendor()
  const preview = !isSupabaseConfigured()
  const vendorId = await resolveVendorIdForSession(
    vendor?.profileId ?? "preview-vendor",
    preview
  )
  const detail = await getVendorOpportunityDetail(vendorId, id)
  if (!detail) return null
  return {
    id: detail.id,
    buyer: detail.buyer,
    title: detail.title,
    fuelType: detail.fuelType,
    quantityGallons: detail.quantityGallons,
    states: detail.deliveryStates,
    dueDate: detail.bidDueDate,
    status: mapInvitationStatus(detail.status),
    emergency: detail.urgency === "emergency",
  }
}

export async function getVendorActivity(): Promise<ActivityEvent[]> {
  return MOCK_ACTIVITY
}

export async function getNotificationPrefs(
  vendorId: string
): Promise<NotificationPrefs> {
  if (!isSupabaseConfigured()) return DEFAULT_PREFS

  const supabase = await createClient()
  const { data } = await supabase
    .from("opportunity_notifications")
    .select("*")
    .eq("vendor_id", vendorId)
    .maybeSingle()

  if (!data) return DEFAULT_PREFS
  return {
    emailFrequency: (data.email_frequency as NotificationPrefs["emailFrequency"]) ?? "daily",
    fuelTypes: Array.isArray(data.fuel_types) ? (data.fuel_types as string[]) : [],
    states: Array.isArray(data.states) ? (data.states as string[]) : [],
    minGallons: typeof data.min_gallons === "number" ? data.min_gallons : 0,
    emergencyImmediate: data.emergency_immediate !== false,
  }
}

export function getDashboardStats(
  vendor: VendorProfile,
  opportunities: Opportunity[]
): VendorDashboardStats {
  return {
    newOpportunitiesThisWeek: opportunities.filter((o) => o.status === "new").length,
    activeRfpInvites: opportunities.filter(
      (o) => o.status !== "responded" && o.status !== "declined"
    ).length,
    bidsSubmittedYtd: opportunities.filter((o) => o.status === "responded").length,
    profileCompleteness: profileCompleteness(vendor),
  }
}
