import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import type { ApplicationStatus } from "@/lib/data/applications"

export interface BuyerApplicationDetail {
  id: string
  invitationToken: string
  status: ApplicationStatus
  submittedAt: string | null
  reviewedAt: string | null

  fullName: string
  companyName: string
  email: string
  phone: string | null
  industry: string | null
  estimatedVolume: string | null
  useCase: string | null
}

export interface BuyerApplicationListItem {
  id: string
  companyName: string
  fullName: string
  email: string
  industry: string | null
  submittedAt: string | null
  status: ApplicationStatus
}

// ---------------------------------------------------------------------------
// Mock data (preview mode when Supabase isn't configured)
// ---------------------------------------------------------------------------
const MOCK_BUYER_APPLICATIONS: BuyerApplicationDetail[] = [
  {
    id: "bapp-metro",
    invitationToken: "tok_bapp-metro",
    status: "pending_review",
    submittedAt: "2026-05-29T15:10:00Z",
    reviewedAt: null,
    fullName: "Jordan Kim",
    companyName: "Metro Transit Authority",
    email: "procurement@metrotransit.example.com",
    phone: "(612) 555-0117",
    industry: "Logistics & Transportation",
    estimatedVolume: "5M – 25M gal/yr",
    useCase:
      "We run a 900-vehicle transit fleet and want to consolidate diesel + DEF sourcing and automate compliance.",
  },
  {
    id: "bapp-mercy",
    invitationToken: "tok_bapp-mercy",
    status: "pending_review",
    submittedAt: "2026-05-28T11:25:00Z",
    reviewedAt: null,
    fullName: "Alicia Romero",
    companyName: "Mercy Regional Health",
    email: "facilities@mercyregional.example.com",
    phone: "(414) 555-0143",
    industry: "Healthcare / Hospital",
    estimatedVolume: "1M – 5M gal/yr",
    useCase:
      "Backup generator fuel and heating oil across 6 hospital campuses; need verified emergency-response suppliers.",
  },
  {
    id: "bapp-harvest",
    invitationToken: "tok_bapp-harvest",
    status: "approved",
    submittedAt: "2026-05-24T09:00:00Z",
    reviewedAt: "2026-05-25T13:30:00Z",
    fullName: "Dev Patel",
    companyName: "Harvest Foods Co.",
    email: "energy@harvestfoods.example.com",
    phone: "(515) 555-0190",
    industry: "Food & Agriculture",
    estimatedVolume: "25M+ gal/yr",
    useCase: "Multi-plant manufacturer sourcing diesel and propane nationwide.",
  },
  {
    id: "bapp-skyport",
    invitationToken: "tok_bapp-skyport",
    status: "rejected",
    submittedAt: "2026-05-20T16:40:00Z",
    reviewedAt: "2026-05-21T10:15:00Z",
    fullName: "Morgan Lee",
    companyName: "Skyport Aviation Services",
    email: "ops@skyport.example.com",
    phone: "(305) 555-0166",
    industry: "Aviation / Airport",
    estimatedVolume: "< 100K gal/yr",
    useCase: "Small FBO exploring jet fuel options.",
  },
]

function rowToDetail(row: Record<string, unknown>): BuyerApplicationDetail {
  const s = (v: unknown) => (typeof v === "string" ? v : null)
  return {
    id: row.id as string,
    invitationToken: (row.invitation_token as string) ?? "",
    status: (row.status as ApplicationStatus) ?? "pending_review",
    submittedAt: s(row.submitted_at),
    reviewedAt: s(row.reviewed_at),
    fullName: (row.full_name as string) ?? "",
    companyName: (row.company_name as string) ?? "Unknown",
    email: (row.email as string) ?? "",
    phone: s(row.phone),
    industry: s(row.industry),
    estimatedVolume: s(row.estimated_volume),
    useCase: s(row.use_case),
  }
}

const toListItem = (a: BuyerApplicationDetail): BuyerApplicationListItem => ({
  id: a.id,
  companyName: a.companyName,
  fullName: a.fullName,
  email: a.email,
  industry: a.industry,
  submittedAt: a.submittedAt,
  status: a.status,
})

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------
export async function listBuyerApplications(): Promise<BuyerApplicationListItem[]> {
  if (!isSupabaseConfigured()) {
    return [...MOCK_BUYER_APPLICATIONS]
      .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))
      .map(toListItem)
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("buyer_applications")
    .select("*")
    .order("submitted_at", { ascending: false, nullsFirst: false })

  if (error || !data) return []
  return data.map((row) => toListItem(rowToDetail(row)))
}

export async function getBuyerApplication(
  id: string
): Promise<BuyerApplicationDetail | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_BUYER_APPLICATIONS.find((a) => a.id === id) ?? null
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("buyer_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  return rowToDetail(data)
}

export async function countPendingBuyerApplications(): Promise<number> {
  if (!isSupabaseConfigured()) {
    return MOCK_BUYER_APPLICATIONS.filter((a) => a.status === "pending_review").length
  }
  const supabase = createAdminClient()
  const { count } = await supabase
    .from("buyer_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review")
  return count ?? 0
}
