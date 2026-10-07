import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { DOCUMENT_BUCKET, DOCUMENT_TYPES, listVendorDocuments, type VendorDocument } from "@/lib/data/documents"
import { fileExtension, isApplicationDocumentPath, isSafeStoragePath, isUuid, isVendorDocumentPath } from "@/lib/storage/paths"

export interface AdminVendorListItem {
  id: string
  companyName: string
  isVerified: boolean
  specialCertification: string | null
  states: string[]
  products: string[]
  nationwide: boolean
  annualGallons: number
  verifiedAt: string | null
  hasLogin: boolean
}

export interface AdminVendorDetail extends AdminVendorListItem {
  description: string | null
  corporateAddress: string | null
  stateOfIncorporation: string | null
  entityType: string | null
  organizationType: string[]
  usDotNumber: string | null
  websiteUrl: string | null
  yearFounded: number | null
  brandsOffered: string | null
  deliveryCapabilities: string[]
  additionalServices: string[]
  tankwagons: number | null
  transports: number | null
  standardOrderLeadTime: string | null
  emergencyOrderLeadTime: string | null
  applicationId: string | null
  createdAt: string
  isDemo: boolean
  loginEmail: string | null
  documents: VendorDocument[]
  /** Required document types with nothing on file. */
  missingDocuments: string[]
  rfpInvitations: number
  bidsSubmitted: number
  contractsAwarded: number
}

const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])
const str = (v: unknown) => (typeof v === "string" && v ? v : null)
const num = (v: unknown) => (typeof v === "number" ? v : null)

function toListItem(row: Record<string, unknown>): AdminVendorListItem {
  return {
    id: row.id as string,
    companyName: (row.company_name as string) ?? "Unknown",
    isVerified: Boolean(row.is_verified),
    specialCertification: str(row.special_certification),
    states: arr(row.licensed_states),
    products: arr(row.products_offered),
    nationwide: Boolean(row.nationwide),
    annualGallons: Number(row.annual_gallons_distributed ?? 0),
    verifiedAt: str(row.verified_at),
    hasLogin: Boolean(row.profile_id),
  }
}

const MOCK_VENDORS: AdminVendorDetail[] = [
  {
    id: "v1",
    companyName: "Gulfstream Fuels",
    isVerified: true,
    specialCertification: null,
    states: ["Texas", "Louisiana", "Oklahoma"],
    products: ["Diesel", "Marine Fuel", "DEF", "Gas"],
    nationwide: false,
    annualGallons: 95_000_000,
    verifiedAt: "2026-05-23T10:30:00Z",
    hasLogin: true,
    description: "Gulf Coast supplier with marine and on-road fleets.",
    corporateAddress: "800 Ship Channel Rd, Houston, TX 77012",
    stateOfIncorporation: "Texas",
    entityType: "Corporation",
    organizationType: ["Supplier", "Transportation/Company Trucks"],
    usDotNumber: null,
    websiteUrl: "https://gulfstreamfuels.com",
    yearFounded: 2001,
    brandsOffered: null,
    deliveryCapabilities: [],
    additionalServices: [],
    tankwagons: 14,
    transports: 22,
    standardOrderLeadTime: "24–48 hours",
    emergencyOrderLeadTime: "4 hours",
    applicationId: "app-gulfstream",
    createdAt: "2026-05-23T10:30:00Z",
    isDemo: true,
    loginEmail: "lucia@gulfstreamfuels.com",
    documents: [],
    missingDocuments: ["W-9", "Certificate of Insurance"],
    rfpInvitations: 3,
    bidsSubmitted: 2,
    contractsAwarded: 1,
  },
]

/** Every vendor record, including suspended ones — the buyer directory only ever sees verified. */
export async function listAdminVendors(): Promise<AdminVendorListItem[]> {
  if (!isSupabaseConfigured()) return MOCK_VENDORS
  const { data } = await createAdminClient().from("vendors").select("*").order("company_name")
  return (data ?? []).map((row) => toListItem(row as Record<string, unknown>))
}

export async function getAdminVendor(id: string): Promise<AdminVendorDetail | null> {
  if (!isSupabaseConfigured()) return MOCK_VENDORS.find((v) => v.id === id) ?? null
  if (!isUuid(id)) return null

  const supabase = createAdminClient()
  const { data: row } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle()
  if (!row) return null

  const count = (table: string, column = "vendor_id") =>
    supabase.from(table).select("id", { count: "exact", head: true }).eq(column, id)

  const [documents, invitations, bids, awards, user] = await Promise.all([
    listVendorDocuments(id),
    count("rfp_invitations"),
    count("rfp_responses").eq("status", "submitted"),
    count("rfps", "awarded_vendor_id"),
    row.profile_id ? supabase.auth.admin.getUserById(row.profile_id as string) : null,
  ])

  return {
    ...toListItem(row),
    description: str(row.description),
    corporateAddress: str(row.corporate_address),
    stateOfIncorporation: str(row.state_of_incorporation),
    entityType: str(row.entity_type),
    organizationType: arr(row.organization_type),
    usDotNumber: str(row.us_dot_number),
    websiteUrl: str(row.website_url),
    yearFounded: num(row.year_founded),
    brandsOffered: str(row.brands_offered),
    deliveryCapabilities: arr(row.delivery_capabilities),
    additionalServices: arr(row.additional_services),
    tankwagons: num(row.tankwagons_count),
    transports: num(row.transports_count),
    standardOrderLeadTime: str(row.standard_order_lead_time),
    emergencyOrderLeadTime: str(row.emergency_order_lead_time),
    applicationId: str(row.application_id),
    createdAt: row.created_at as string,
    isDemo: Boolean(row.is_demo),
    loginEmail: user?.data?.user?.email ?? null,
    documents,
    missingDocuments: DOCUMENT_TYPES.filter((t) => t.required && !documents.some((d) => d.type === t.type)).map((t) => t.label),
    rfpInvitations: invitations.count ?? 0,
    bidsSubmitted: bids.count ?? 0,
    contractsAwarded: awards.count ?? 0,
  }
}

const INLINE_SAFE = ["pdf", "png", "jpg", "jpeg"]

/**
 * Short-lived URL for one of a vendor's compliance documents. Admin screens
 * only — the caller must have checked requireAdmin(). Accepts files the vendor
 * uploaded in the portal and ones carried over from their application at approval.
 */
export async function adminVendorDocumentUrl(vendorId: string, documentId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !isUuid(vendorId) || !isUuid(documentId)) return null
  const supabase = createAdminClient()
  const [{ data: doc }, { data: vendor }] = await Promise.all([
    supabase.from("vendor_documents").select("file_url").eq("id", documentId).eq("vendor_id", vendorId).maybeSingle(),
    supabase.from("vendors").select("application_id").eq("id", vendorId).maybeSingle(),
  ])
  const path = doc?.file_url as string | undefined
  const applicationId = vendor?.application_id as string | null | undefined
  if (!isSafeStoragePath(path)) return null
  if (!isVendorDocumentPath(path, vendorId) && !(applicationId && isApplicationDocumentPath(path, applicationId))) return null
  // Older uploads weren't type-checked; anything but a PDF or image downloads instead of rendering.
  const { data } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(path, 300, { download: !INLINE_SAFE.includes(fileExtension(path)) })
  return data?.signedUrl ?? null
}
