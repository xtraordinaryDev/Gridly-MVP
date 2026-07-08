import "server-only"

import type { RfpWizardInput } from "@/lib/schemas/rfp-wizard"
import type { RfpBidInput } from "@/lib/schemas/rfp-wizard"
import type {
  BuyerRfpDetail,
  BuyerRfpListItem,
  InvitationStatus,
  RfpActivityItem,
  RfpInvitationView,
  RfpResponseView,
  RfpStatus,
  VendorOpportunityDetail,
  VendorOpportunityListItem,
} from "@/lib/rfp/types"
import { listVerifiedVendors } from "@/lib/data/directory"
import { matchVerifiedSuppliers } from "@/lib/rfp/match-suppliers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import {
  sendBidSubmittedEmail,
  sendNewRfpNotification,
  sendRfpAwardedEmails,
  sendRfpInvitationEmails,
} from "@/lib/email/notifications"

// ---------------------------------------------------------------------------
// Mock store (preview mode)
// ---------------------------------------------------------------------------
interface MockRfp {
  id: string
  buyerId: string
  buyerName: string
  title: string
  description: string
  fuelType: string
  quantityGallons: number
  recurrence: "one_time" | "recurring"
  urgency: "standard" | "rush" | "emergency"
  deliveryStates: string[]
  deliveryAddresses: string[]
  deliveryDates: string[]
  requiredCapabilities: string[]
  requiredCertifications: string[]
  insuranceRequirements: string | null
  bidDueDate: string | null
  decisionDate: string | null
  expectedAwardDate: string | null
  status: RfpStatus
  awardedVendorId: string | null
  createdAt: string
  publishedAt: string | null
}

interface MockInvitation {
  id: string
  rfpId: string
  vendorId: string
  invitedAt: string
  viewedAt: string | null
  respondedAt: string | null
  declinedAt: string | null
}

interface MockResponse {
  id: string
  rfpId: string
  vendorId: string
  pricePerGallon: number
  totalPrice: number
  deliveryTerms: string
  validityDays: number
  notes: string | null
  submittedAt: string
  status: string
}

interface MockStore {
  rfps: MockRfp[]
  invitations: MockInvitation[]
  responses: MockResponse[]
}

const PREVIEW_BUYER_ID = "preview-buyer"
const PREVIEW_VENDOR_ID = "vendor-apex"

function seedMockStore(): MockStore {
  const rfps: MockRfp[] = [
    {
      id: "rfp-metcouncil",
      buyerId: PREVIEW_BUYER_ID,
      buyerName: "Metropolitan Council",
      title: "Bulk Diesel & DEF — Transit Fleet FY27",
      description:
        "Annual supply contract for on-road diesel and DEF across Metro Transit facilities. Wet-hose capability required at two depots.",
      fuelType: "Diesel",
      quantityGallons: 2_400_000,
      recurrence: "recurring",
      urgency: "standard",
      deliveryStates: ["Minnesota"],
      deliveryAddresses: ["560 6th Ave N, Minneapolis, MN 55411", "800 Transfer Rd, St. Paul, MN 55114"],
      deliveryDates: ["2026-07-01", "2026-10-01"],
      requiredCapabilities: ["Wet-hose/Mobile Refueling", "Provide delivery tickets within 24 hours"],
      requiredCertifications: ["DBE"],
      insuranceRequirements: "$2M general liability, $1M auto",
      bidDueDate: "2026-06-15T23:59:00Z",
      decisionDate: "2026-06-22T23:59:00Z",
      expectedAwardDate: "2026-07-01T23:59:00Z",
      status: "published",
      awardedVendorId: null,
      createdAt: "2026-05-28T11:40:00Z",
      publishedAt: "2026-05-28T11:40:00Z",
    },
    {
      id: "rfp-citychicago",
      buyerId: PREVIEW_BUYER_ID,
      buyerName: "Metro Transit Authority",
      title: "Unleaded & Premium Gasoline Supply",
      description: "Municipal fleet gasoline for Q3–Q4.",
      fuelType: "Gas",
      quantityGallons: 1_800_000,
      recurrence: "one_time",
      urgency: "standard",
      deliveryStates: ["Illinois"],
      deliveryAddresses: ["121 N LaSalle St, Chicago, IL 60602"],
      deliveryDates: ["2026-08-01"],
      requiredCapabilities: [],
      requiredCertifications: [],
      insuranceRequirements: null,
      bidDueDate: "2026-06-09T23:59:00Z",
      decisionDate: "2026-06-16T23:59:00Z",
      expectedAwardDate: "2026-06-30T23:59:00Z",
      status: "published",
      awardedVendorId: null,
      createdAt: "2026-05-28T09:30:00Z",
      publishedAt: "2026-05-28T09:30:00Z",
    },
    {
      id: "rfp-emergency",
      buyerId: PREVIEW_BUYER_ID,
      buyerName: "Metro Transit Authority",
      title: "EMERGENCY: Storm Response Dyed Diesel",
      description: "Emergency dyed diesel for road crews — 48hr mobilization.",
      fuelType: "Dyed Diesel",
      quantityGallons: 350_000,
      recurrence: "one_time",
      urgency: "emergency",
      deliveryStates: ["Iowa"],
      deliveryAddresses: ["District 4 Yard, Des Moines, IA"],
      deliveryDates: ["2026-06-05"],
      requiredCapabilities: ["Wet-hose/Mobile Refueling"],
      requiredCertifications: [],
      insuranceRequirements: "$2M GL minimum",
      bidDueDate: "2026-06-03T23:59:00Z",
      decisionDate: "2026-06-04T23:59:00Z",
      expectedAwardDate: "2026-06-05T23:59:00Z",
      status: "published",
      awardedVendorId: null,
      createdAt: "2026-05-29T08:00:00Z",
      publishedAt: "2026-05-29T08:00:00Z",
    },
    {
      id: "rfp-schooldist",
      buyerId: PREVIEW_BUYER_ID,
      buyerName: "Metro Transit Authority",
      title: "Heating Oil & Diesel — Annual Contract",
      description: "Campus facilities annual fuel contract.",
      fuelType: "Diesel",
      quantityGallons: 920_000,
      recurrence: "recurring",
      urgency: "standard",
      deliveryStates: ["Wisconsin"],
      deliveryAddresses: ["1200 Campus Dr, Madison, WI"],
      deliveryDates: ["2026-09-01"],
      requiredCapabilities: [],
      requiredCertifications: [],
      insuranceRequirements: null,
      bidDueDate: "2026-06-22T23:59:00Z",
      decisionDate: "2026-06-29T23:59:00Z",
      expectedAwardDate: "2026-07-15T23:59:00Z",
      status: "awarded",
      awardedVendorId: "vendor-dir-1",
      createdAt: "2026-05-20T10:00:00Z",
      publishedAt: "2026-05-20T10:00:00Z",
    },
    {
      id: "rfp-portauth",
      buyerId: PREVIEW_BUYER_ID,
      buyerName: "Metro Transit Authority",
      title: "Marine & On-Road Diesel — Q3",
      description: "Port authority diesel supply.",
      fuelType: "Diesel",
      quantityGallons: 640_000,
      recurrence: "one_time",
      urgency: "standard",
      deliveryStates: ["Indiana"],
      deliveryAddresses: ["Port of Indiana, Burns Harbor"],
      deliveryDates: ["2026-08-15"],
      requiredCapabilities: [],
      requiredCertifications: [],
      insuranceRequirements: null,
      bidDueDate: "2026-07-01T23:59:00Z",
      decisionDate: "2026-07-08T23:59:00Z",
      expectedAwardDate: "2026-07-20T23:59:00Z",
      status: "published",
      awardedVendorId: null,
      createdAt: "2026-05-27T10:00:00Z",
      publishedAt: "2026-05-27T10:00:00Z",
    },
    {
      id: "rfp-airport-msp",
      buyerId: "buyer-ext-msp",
      buyerName: "MSP Airport Commission",
      title: "Jet Fuel & Ground Fleet Diesel — FY27",
      description:
        "Annual jet fuel supply plus diesel for ground support equipment at Terminals 1 and 2.",
      fuelType: "Jet Fuel",
      quantityGallons: 5_600_000,
      recurrence: "recurring",
      urgency: "standard",
      deliveryStates: ["Minnesota"],
      deliveryAddresses: ["4300 Glumack Dr, St. Paul, MN 55111"],
      deliveryDates: ["2026-08-01"],
      requiredCapabilities: ["Provide delivery tickets within 24 hours"],
      requiredCertifications: [],
      insuranceRequirements: "$5M general liability",
      bidDueDate: "2026-07-18T23:59:00Z",
      decisionDate: "2026-07-25T23:59:00Z",
      expectedAwardDate: "2026-08-01T23:59:00Z",
      status: "published",
      awardedVendorId: null,
      createdAt: "2026-06-28T09:00:00Z",
      publishedAt: "2026-06-28T09:00:00Z",
    },
    {
      id: "rfp-hospital-network",
      buyerId: "buyer-ext-mercy",
      buyerName: "Mercy Health Network",
      title: "Backup Generator Diesel — 14 Hospital Campuses",
      description:
        "Standing contract for generator diesel with quarterly top-offs and 4-hour emergency response requirement.",
      fuelType: "Diesel",
      quantityGallons: 480_000,
      recurrence: "recurring",
      urgency: "standard",
      deliveryStates: ["Illinois", "Wisconsin"],
      deliveryAddresses: ["Multiple campuses — list provided on award"],
      deliveryDates: ["2026-08-15"],
      requiredCapabilities: ["Wet-hose/Mobile Refueling"],
      requiredCertifications: [],
      insuranceRequirements: "$2M general liability, $1M auto",
      bidDueDate: "2026-07-22T23:59:00Z",
      decisionDate: "2026-07-29T23:59:00Z",
      expectedAwardDate: "2026-08-10T23:59:00Z",
      status: "published",
      awardedVendorId: null,
      createdAt: "2026-06-30T14:00:00Z",
      publishedAt: "2026-06-30T14:00:00Z",
    },
    {
      id: "rfp-agco-harvest",
      buyerId: "buyer-ext-agco",
      buyerName: "Heartland Grain Cooperative",
      title: "Harvest Season Dyed Diesel — 22 Elevator Sites",
      description:
        "Dyed diesel for grain dryers and farm equipment across Iowa and southern Minnesota elevators, September through November.",
      fuelType: "Dyed Diesel",
      quantityGallons: 1_150_000,
      recurrence: "one_time",
      urgency: "standard",
      deliveryStates: ["Iowa", "Minnesota"],
      deliveryAddresses: ["Site list attached to RFP packet"],
      deliveryDates: ["2026-09-05", "2026-10-05", "2026-11-05"],
      requiredCapabilities: ["Install Tank Monitors"],
      requiredCertifications: [],
      insuranceRequirements: null,
      bidDueDate: "2026-07-30T23:59:00Z",
      decisionDate: "2026-08-08T23:59:00Z",
      expectedAwardDate: "2026-08-20T23:59:00Z",
      status: "published",
      awardedVendorId: null,
      createdAt: "2026-07-01T10:00:00Z",
      publishedAt: "2026-07-01T10:00:00Z",
    },
    {
      id: "rfp-logistics-defrun",
      buyerId: "buyer-ext-tlx",
      buyerName: "TransLoad Express",
      title: "DEF Supply — Regional Distribution Hubs",
      description:
        "Bulk DEF for five Midwest distribution hubs with tank monitoring preferred.",
      fuelType: "DEF",
      quantityGallons: 260_000,
      recurrence: "recurring",
      urgency: "standard",
      deliveryStates: ["Illinois", "Indiana", "Missouri"],
      deliveryAddresses: ["Hub addresses shared post-NDA"],
      deliveryDates: ["2026-08-01"],
      requiredCapabilities: [],
      requiredCertifications: ["DBE"],
      insuranceRequirements: null,
      bidDueDate: "2026-07-25T23:59:00Z",
      decisionDate: "2026-08-01T23:59:00Z",
      expectedAwardDate: "2026-08-15T23:59:00Z",
      status: "published",
      awardedVendorId: null,
      createdAt: "2026-07-02T08:30:00Z",
      publishedAt: "2026-07-02T08:30:00Z",
    },
    {
      id: "rfp-county-roads",
      buyerId: "buyer-ext-dane",
      buyerName: "Dane County Public Works",
      title: "Winter Ops Diesel & Heating Oil Pre-Buy",
      description:
        "Pre-season purchase of diesel for plow fleet and heating oil for county garages ahead of winter operations.",
      fuelType: "Diesel",
      quantityGallons: 780_000,
      recurrence: "one_time",
      urgency: "standard",
      deliveryStates: ["Wisconsin"],
      deliveryAddresses: ["1919 Alliant Energy Center Way, Madison, WI"],
      deliveryDates: ["2026-10-01"],
      requiredCapabilities: [],
      requiredCertifications: [],
      insuranceRequirements: "$1M general liability",
      bidDueDate: "2026-08-05T23:59:00Z",
      decisionDate: "2026-08-14T23:59:00Z",
      expectedAwardDate: "2026-09-01T23:59:00Z",
      status: "published",
      awardedVendorId: null,
      createdAt: "2026-07-03T11:15:00Z",
      publishedAt: "2026-07-03T11:15:00Z",
    },
    {
      id: "rfp-utility-rush",
      buyerId: "buyer-ext-nsp",
      buyerName: "Northern States Power",
      title: "RUSH: Peaker Plant Fuel Oil — July Heat Event",
      description:
        "Expedited fuel oil delivery for peaker plants ahead of forecast July heat wave. 72-hour mobilization window.",
      fuelType: "Heating Oil",
      quantityGallons: 420_000,
      recurrence: "one_time",
      urgency: "rush",
      deliveryStates: ["Minnesota"],
      deliveryAddresses: ["Black Dog Generating Plant, Burnsville, MN"],
      deliveryDates: ["2026-07-14"],
      requiredCapabilities: ["Wet-hose/Mobile Refueling"],
      requiredCertifications: [],
      insuranceRequirements: "$2M GL minimum",
      bidDueDate: "2026-07-10T23:59:00Z",
      decisionDate: "2026-07-11T23:59:00Z",
      expectedAwardDate: "2026-07-12T23:59:00Z",
      status: "published",
      awardedVendorId: null,
      createdAt: "2026-07-05T07:45:00Z",
      publishedAt: "2026-07-05T07:45:00Z",
    },
    {
      id: "rfp-draft-demo",
      buyerId: PREVIEW_BUYER_ID,
      buyerName: "Metro Transit Authority",
      title: "Propane — Remote Sites (Draft)",
      description: "Draft RFP for propane supply to remote maintenance sites.",
      fuelType: "Propane",
      quantityGallons: 120_000,
      recurrence: "one_time",
      urgency: "standard",
      deliveryStates: ["Minnesota", "Wisconsin"],
      deliveryAddresses: ["TBD"],
      deliveryDates: ["2026-11-01"],
      requiredCapabilities: [],
      requiredCertifications: [],
      insuranceRequirements: null,
      bidDueDate: null,
      decisionDate: null,
      expectedAwardDate: null,
      status: "draft",
      awardedVendorId: null,
      createdAt: "2026-05-31T08:00:00Z",
      publishedAt: null,
    },
  ]

  const invitations: MockInvitation[] = [
    { id: "inv-1", rfpId: "rfp-metcouncil", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-05-28T11:40:00Z", viewedAt: null, respondedAt: null, declinedAt: null },
    { id: "inv-2", rfpId: "rfp-metcouncil", vendorId: "vendor-dir-0", invitedAt: "2026-05-28T11:40:00Z", viewedAt: "2026-05-29T10:00:00Z", respondedAt: "2026-05-30T14:00:00Z", declinedAt: null },
    { id: "inv-3", rfpId: "rfp-metcouncil", vendorId: "vendor-dir-1", invitedAt: "2026-05-28T11:40:00Z", viewedAt: "2026-05-29T11:00:00Z", respondedAt: "2026-05-30T15:30:00Z", declinedAt: null },
    { id: "inv-4", rfpId: "rfp-metcouncil", vendorId: "vendor-dir-2", invitedAt: "2026-05-28T11:40:00Z", viewedAt: "2026-05-30T09:00:00Z", respondedAt: null, declinedAt: null },
    { id: "inv-5", rfpId: "rfp-citychicago", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-05-28T09:30:00Z", viewedAt: null, respondedAt: null, declinedAt: null },
    { id: "inv-6", rfpId: "rfp-emergency", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-05-29T08:00:00Z", viewedAt: "2026-05-29T09:05:00Z", respondedAt: null, declinedAt: null },
    { id: "inv-7", rfpId: "rfp-schooldist", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-05-20T10:00:00Z", viewedAt: "2026-05-21T10:00:00Z", respondedAt: "2026-05-30T15:20:00Z", declinedAt: null },
    { id: "inv-8", rfpId: "rfp-portauth", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-05-27T10:00:00Z", viewedAt: null, respondedAt: null, declinedAt: null },
    { id: "inv-9", rfpId: "rfp-airport-msp", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-06-28T09:00:00Z", viewedAt: "2026-06-29T08:15:00Z", respondedAt: null, declinedAt: null },
    { id: "inv-10", rfpId: "rfp-hospital-network", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-06-30T14:00:00Z", viewedAt: null, respondedAt: null, declinedAt: null },
    { id: "inv-11", rfpId: "rfp-agco-harvest", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-07-01T10:00:00Z", viewedAt: null, respondedAt: null, declinedAt: null },
    { id: "inv-12", rfpId: "rfp-logistics-defrun", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-07-02T08:30:00Z", viewedAt: "2026-07-03T09:00:00Z", respondedAt: null, declinedAt: null },
    { id: "inv-13", rfpId: "rfp-county-roads", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-07-03T11:15:00Z", viewedAt: null, respondedAt: null, declinedAt: null },
    { id: "inv-14", rfpId: "rfp-utility-rush", vendorId: PREVIEW_VENDOR_ID, invitedAt: "2026-07-05T07:45:00Z", viewedAt: null, respondedAt: null, declinedAt: null },
  ]

  const responses: MockResponse[] = [
    {
      id: "resp-1",
      rfpId: "rfp-metcouncil",
      vendorId: "vendor-dir-0",
      pricePerGallon: 3.42,
      totalPrice: 8_208_000,
      deliveryTerms: "FOB depot, net 30",
      validityDays: 30,
      notes: "Includes winter additive package.",
      submittedAt: "2026-05-30T14:00:00Z",
      status: "submitted",
    },
    {
      id: "resp-2",
      rfpId: "rfp-metcouncil",
      vendorId: "vendor-dir-1",
      pricePerGallon: 3.28,
      totalPrice: 7_872_000,
      deliveryTerms: "Delivered, net 45",
      validityDays: 45,
      notes: "Lowest total — DBE certified.",
      submittedAt: "2026-05-30T15:30:00Z",
      status: "submitted",
    },
    {
      id: "resp-3",
      rfpId: "rfp-schooldist",
      vendorId: PREVIEW_VENDOR_ID,
      pricePerGallon: 3.55,
      totalPrice: 3_266_000,
      deliveryTerms: "Delivered campus",
      validityDays: 30,
      notes: null,
      submittedAt: "2026-05-30T15:20:00Z",
      status: "submitted",
    },
  ]

  return { rfps, invitations, responses }
}

function getMockStore(): MockStore {
  const g = globalThis as unknown as { __gridlinkRfpMock?: MockStore }
  if (!g.__gridlinkRfpMock) g.__gridlinkRfpMock = seedMockStore()
  return g.__gridlinkRfpMock
}

const vendorNameCache = new Map<string, string>()

async function vendorName(vendorId: string): Promise<string> {
  if (vendorNameCache.has(vendorId)) return vendorNameCache.get(vendorId)!
  if (vendorId === PREVIEW_VENDOR_ID) return "Apex Fuel Co."
  const vendors = await listVerifiedVendors()
  const v = vendors.find((x) => x.id === vendorId)
  const name = v?.companyName ?? "Supplier"
  vendorNameCache.set(vendorId, name)
  return name
}

function invitationStatus(inv: MockInvitation): InvitationStatus {
  if (inv.declinedAt) return "declined"
  if (inv.respondedAt) return "responded"
  if (inv.viewedAt) return "viewed"
  return "invited"
}

function buildActivity(
  rfp: MockRfp,
  invitations: MockInvitation[],
  responses: MockResponse[]
): RfpActivityItem[] {
  const items: RfpActivityItem[] = [
    {
      id: `${rfp.id}-created`,
      type: "created",
      label: `RFP created — ${rfp.title}`,
      date: rfp.createdAt,
    },
  ]
  if (rfp.publishedAt) {
    items.push({
      id: `${rfp.id}-pub`,
      type: "published",
      label: "Published and invitations sent",
      date: rfp.publishedAt,
    })
  }
  for (const inv of invitations) {
    items.push({
      id: `${inv.id}-inv`,
      type: "invited",
      label: `Invitation sent to supplier`,
      date: inv.invitedAt,
    })
    if (inv.viewedAt) {
      items.push({
        id: `${inv.id}-view`,
        type: "viewed",
        label: `Supplier viewed invitation`,
        date: inv.viewedAt,
      })
    }
    if (inv.declinedAt) {
      items.push({
        id: `${inv.id}-dec`,
        type: "declined",
        label: `Supplier declined to bid`,
        date: inv.declinedAt,
      })
    }
  }
  for (const r of responses) {
    items.push({
      id: `${r.id}-bid`,
      type: "bid",
      label: `Bid submitted`,
      date: r.submittedAt,
    })
  }
  if (rfp.status === "awarded" && rfp.awardedVendorId) {
    items.push({
      id: `${rfp.id}-award`,
      type: "awarded",
      label: "Contract awarded",
      date: rfp.expectedAwardDate ?? rfp.createdAt,
    })
  }
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ---------------------------------------------------------------------------
// Buyer accessors
// ---------------------------------------------------------------------------
export async function listBuyerRfps(buyerId: string): Promise<BuyerRfpListItem[]> {
  if (!isSupabaseConfigured()) {
    const store = getMockStore()
    return store.rfps
      .filter(
        (r) =>
          r.buyerId === buyerId ||
          (buyerId === PREVIEW_BUYER_ID && r.buyerId === PREVIEW_BUYER_ID)
      )
      .map((r) => {
        const invs = store.invitations.filter((i) => i.rfpId === r.id)
        const resps = store.responses.filter((x) => x.rfpId === r.id)
        return {
          id: r.id,
          title: r.title,
          fuelType: r.fuelType,
          quantityGallons: r.quantityGallons,
          deliveryStates: r.deliveryStates,
          status: r.status,
          invitedCount: invs.length,
          responseCount: resps.length,
          bidDueDate: r.bidDueDate,
        }
      })
      .sort((a, b) => (b.bidDueDate ?? "").localeCompare(a.bidDueDate ?? ""))
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from("rfps")
    .select("*, rfp_invitations(id), rfp_responses(id)")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })

  return (data ?? []).map((row) => {
    const inv = row.rfp_invitations as { id: string }[] | null
    const res = row.rfp_responses as { id: string }[] | null
    return {
      id: row.id as string,
      title: row.title as string,
      fuelType: (row.fuel_type as string) ?? "",
      quantityGallons: Number(row.quantity_gallons) || 0,
      deliveryStates: (row.delivery_states as string[]) ?? [],
      status: row.status as RfpStatus,
      invitedCount: inv?.length ?? 0,
      responseCount: res?.length ?? 0,
      bidDueDate: row.bid_due_date as string | null,
    }
  })
}

export async function getBuyerRfpDetail(
  rfpId: string,
  buyerId: string
): Promise<BuyerRfpDetail | null> {
  if (!isSupabaseConfigured()) {
    const store = getMockStore()
    const rfp = store.rfps.find(
      (r) => r.id === rfpId && (r.buyerId === buyerId || buyerId === PREVIEW_BUYER_ID)
    )
    if (!rfp) return null

    const invs = store.invitations.filter((i) => i.rfpId === rfpId)
    const resps = store.responses.filter((x) => x.rfpId === rfpId)

    const invitations: RfpInvitationView[] = await Promise.all(
      invs.map(async (inv) => ({
        id: inv.id,
        vendorId: inv.vendorId,
        companyName: await vendorName(inv.vendorId),
        status: invitationStatus(inv),
        invitedAt: inv.invitedAt,
        viewedAt: inv.viewedAt,
        respondedAt: inv.respondedAt,
      }))
    )

    const responses: RfpResponseView[] = await Promise.all(
      resps.map(async (r) => ({
        id: r.id,
        vendorId: r.vendorId,
        companyName: await vendorName(r.vendorId),
        pricePerGallon: r.pricePerGallon,
        totalPrice: r.totalPrice,
        deliveryTerms: r.deliveryTerms,
        validityDays: r.validityDays,
        notes: r.notes,
        submittedAt: r.submittedAt,
        status: r.status,
      }))
    )

    const awardedName = rfp.awardedVendorId
      ? await vendorName(rfp.awardedVendorId)
      : null

    return {
      id: rfp.id,
      title: rfp.title,
      description: rfp.description,
      fuelType: rfp.fuelType,
      quantityGallons: rfp.quantityGallons,
      recurrence: rfp.recurrence,
      urgency: rfp.urgency,
      deliveryStates: rfp.deliveryStates,
      deliveryAddresses: rfp.deliveryAddresses,
      deliveryDates: rfp.deliveryDates,
      requiredCapabilities: rfp.requiredCapabilities,
      requiredCertifications: rfp.requiredCertifications,
      insuranceRequirements: rfp.insuranceRequirements,
      bidDueDate: rfp.bidDueDate,
      decisionDate: rfp.decisionDate,
      expectedAwardDate: rfp.expectedAwardDate,
      status: rfp.status,
      awardedVendorId: rfp.awardedVendorId,
      awardedVendorName: awardedName,
      createdAt: rfp.createdAt,
      publishedAt: rfp.publishedAt,
      invitations,
      responses,
      activity: buildActivity(rfp, invs, resps),
    }
  }

  const supabase = await createClient()
  const { data: rfp } = await supabase
    .from("rfps")
    .select("*")
    .eq("id", rfpId)
    .eq("buyer_id", buyerId)
    .maybeSingle()

  if (!rfp) return null

  const [{ data: invRows }, { data: respRows }] = await Promise.all([
    supabase.from("rfp_invitations").select("*").eq("rfp_id", rfpId),
    supabase.from("rfp_responses").select("*").eq("rfp_id", rfpId),
  ])

  const invitations: RfpInvitationView[] = await Promise.all(
    (invRows ?? []).map(async (inv) => ({
      id: inv.id as string,
      vendorId: inv.vendor_id as string,
      companyName: await vendorName(inv.vendor_id as string),
      status: invitationStatus({
        id: inv.id as string,
        rfpId,
        vendorId: inv.vendor_id as string,
        invitedAt: inv.invited_at as string,
        viewedAt: (inv.viewed_at as string) ?? null,
        respondedAt: (inv.responded_at as string) ?? null,
        declinedAt: (inv.declined_at as string) ?? null,
      }),
      invitedAt: inv.invited_at as string,
      viewedAt: (inv.viewed_at as string) ?? null,
      respondedAt: (inv.responded_at as string) ?? null,
    }))
  )

  const responses: RfpResponseView[] = await Promise.all(
    (respRows ?? []).map(async (r) => ({
      id: r.id as string,
      vendorId: r.vendor_id as string,
      companyName: await vendorName(r.vendor_id as string),
      pricePerGallon: Number(r.price_per_gallon),
      totalPrice: Number(r.total_price),
      deliveryTerms: (r.delivery_terms as string) ?? "",
      validityDays: (r.validity_days as number) ?? 0,
      notes: (r.notes as string) ?? null,
      submittedAt: r.submitted_at as string,
      status: r.status as string,
    }))
  )

  const awardedVendorId = (rfp.awarded_vendor_id as string) ?? null

  return {
    id: rfp.id as string,
    title: rfp.title as string,
    description: (rfp.description as string) ?? "",
    fuelType: (rfp.fuel_type as string) ?? "",
    quantityGallons: Number(rfp.quantity_gallons) || 0,
    recurrence: ((rfp.recurrence as string) ?? "one_time") as "one_time" | "recurring",
    urgency: ((rfp.urgency as string) ?? "standard") as "standard" | "rush" | "emergency",
    deliveryStates: (rfp.delivery_states as string[]) ?? [],
    deliveryAddresses: (rfp.delivery_addresses as string[]) ?? [],
    deliveryDates: ((rfp.delivery_dates as string[]) ?? []).map(String),
    requiredCapabilities: (rfp.required_capabilities as string[]) ?? [],
    requiredCertifications: (rfp.required_certifications as string[]) ?? [],
    insuranceRequirements: (rfp.insurance_requirements as string) ?? null,
    bidDueDate: (rfp.bid_due_date as string) ?? null,
    decisionDate: (rfp.decision_date as string) ?? null,
    expectedAwardDate: (rfp.expected_award_date as string) ?? null,
    status: rfp.status as RfpStatus,
    awardedVendorId,
    awardedVendorName: awardedVendorId ? await vendorName(awardedVendorId) : null,
    createdAt: rfp.created_at as string,
    publishedAt: (rfp.published_at as string) ?? null,
    invitations,
    responses,
    activity: buildActivity(
      {
        id: rfp.id as string,
        buyerId,
        buyerName: "",
        title: rfp.title as string,
        description: (rfp.description as string) ?? "",
        fuelType: (rfp.fuel_type as string) ?? "",
        quantityGallons: Number(rfp.quantity_gallons) || 0,
        recurrence: ((rfp.recurrence as string) ?? "one_time") as "one_time" | "recurring",
        urgency: ((rfp.urgency as string) ?? "standard") as "standard" | "rush" | "emergency",
        deliveryStates: (rfp.delivery_states as string[]) ?? [],
        deliveryAddresses: (rfp.delivery_addresses as string[]) ?? [],
        deliveryDates: ((rfp.delivery_dates as string[]) ?? []).map(String),
        requiredCapabilities: (rfp.required_capabilities as string[]) ?? [],
        requiredCertifications: (rfp.required_certifications as string[]) ?? [],
        insuranceRequirements: (rfp.insurance_requirements as string) ?? null,
        bidDueDate: (rfp.bid_due_date as string) ?? null,
        decisionDate: (rfp.decision_date as string) ?? null,
        expectedAwardDate: (rfp.expected_award_date as string) ?? null,
        status: rfp.status as RfpStatus,
        awardedVendorId,
        createdAt: rfp.created_at as string,
        publishedAt: (rfp.published_at as string) ?? null,
      },
      (invRows ?? []).map((inv) => ({
        id: inv.id as string,
        rfpId,
        vendorId: inv.vendor_id as string,
        invitedAt: inv.invited_at as string,
        viewedAt: (inv.viewed_at as string) ?? null,
        respondedAt: (inv.responded_at as string) ?? null,
        declinedAt: (inv.declined_at as string) ?? null,
      })),
      (respRows ?? []).map((r) => ({
        id: r.id as string,
        rfpId,
        vendorId: r.vendor_id as string,
        pricePerGallon: Number(r.price_per_gallon),
        totalPrice: Number(r.total_price),
        deliveryTerms: (r.delivery_terms as string) ?? "",
        validityDays: (r.validity_days as number) ?? 0,
        notes: (r.notes as string) ?? null,
        submittedAt: r.submitted_at as string,
        status: r.status as string,
      }))
    ),
  }
}

// ---------------------------------------------------------------------------
// Admin accessors
// ---------------------------------------------------------------------------
export interface AdminRfpListItem {
  id: string
  title: string
  buyerName: string
  fuelType: string
  quantityGallons: number
  deliveryStates: string[]
  urgency: "standard" | "rush" | "emergency"
  status: RfpStatus
  invitedCount: number
  responseCount: number
  bidDueDate: string | null
  createdAt: string
}

/** All RFPs across every buyer — for the GridLink operations console. */
export async function listAllRfps(): Promise<AdminRfpListItem[]> {
  if (!isSupabaseConfigured()) {
    const store = getMockStore()
    return store.rfps
      .map((r) => ({
        id: r.id,
        title: r.title,
        buyerName: r.buyerName,
        fuelType: r.fuelType,
        quantityGallons: r.quantityGallons,
        deliveryStates: r.deliveryStates,
        urgency: r.urgency,
        status: r.status,
        invitedCount: store.invitations.filter((i) => i.rfpId === r.id).length,
        responseCount: store.responses.filter((x) => x.rfpId === r.id).length,
        bidDueDate: r.bidDueDate,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("rfps")
    .select("*, rfp_invitations(id), rfp_responses(id)")
    .order("created_at", { ascending: false })

  const buyerIds = [...new Set((data ?? []).map((r) => r.buyer_id as string))]
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, company_name")
    .in("id", buyerIds)
  const buyerNames = new Map(
    (profiles ?? []).map((p) => [p.id as string, (p.company_name as string) ?? "Buyer"])
  )

  return (data ?? []).map((row) => {
    const inv = row.rfp_invitations as { id: string }[] | null
    const res = row.rfp_responses as { id: string }[] | null
    return {
      id: row.id as string,
      title: row.title as string,
      buyerName: buyerNames.get(row.buyer_id as string) ?? "Buyer",
      fuelType: (row.fuel_type as string) ?? "",
      quantityGallons: Number(row.quantity_gallons) || 0,
      deliveryStates: (row.delivery_states as string[]) ?? [],
      urgency: ((row.urgency as string) ?? "standard") as "standard" | "rush" | "emergency",
      status: row.status as RfpStatus,
      invitedCount: inv?.length ?? 0,
      responseCount: res?.length ?? 0,
      bidDueDate: (row.bid_due_date as string) ?? null,
      createdAt: row.created_at as string,
    }
  })
}

// ---------------------------------------------------------------------------
// Mutations (buyer)
// ---------------------------------------------------------------------------
export async function saveRfpFromWizard(
  buyerId: string,
  buyerName: string,
  input: RfpWizardInput,
  publish: boolean
): Promise<{ ok: true; rfpId: string } | { ok: false; message: string }> {
  const vendorIds =
    input.supplierInviteMode === "manual"
      ? input.selectedVendorIds
      : matchVerifiedSuppliers(await listVerifiedVendors(), {
          states: input.deliveryStates,
          capabilities: input.requiredCapabilities,
          certifications: input.requiredCertifications.filter((c) => c !== "None"),
        }).map((v) => v.id)

  if (publish && vendorIds.length === 0) {
    return { ok: false, message: "Select at least one supplier to invite." }
  }

  const now = new Date().toISOString()
  const rfpId = `rfp-${Date.now()}`

  if (!isSupabaseConfigured()) {
    const store = getMockStore()
    store.rfps.push({
      id: rfpId,
      buyerId: PREVIEW_BUYER_ID,
      buyerName,
      title: input.title,
      description: input.description,
      fuelType: input.fuelType,
      quantityGallons: input.quantityGallons,
      recurrence: input.recurrence,
      urgency: input.urgency,
      deliveryStates: [...input.deliveryStates],
      deliveryAddresses: input.deliveryAddresses.map((a) => a.address),
      deliveryDates: [...input.deliveryDates],
      requiredCapabilities: [...input.requiredCapabilities],
      requiredCertifications: input.requiredCertifications.filter((c) => c !== "None"),
      insuranceRequirements: input.insuranceRequirements ?? null,
      bidDueDate: new Date(input.bidDueDate).toISOString(),
      decisionDate: new Date(input.decisionDate).toISOString(),
      expectedAwardDate: new Date(input.expectedAwardDate).toISOString(),
      status: publish ? "published" : "draft",
      awardedVendorId: null,
      createdAt: now,
      publishedAt: publish ? now : null,
    })

    if (publish) {
      for (const vendorId of vendorIds) {
        store.invitations.push({
          id: `inv-${Date.now()}-${vendorId}`,
          rfpId,
          vendorId,
          invitedAt: now,
          viewedAt: null,
          respondedAt: null,
          declinedAt: null,
        })
      }
      await sendRfpInvitationEmails({
        rfpId,
        rfpTitle: input.title,
        fuelType: input.fuelType,
        quantityGallons: input.quantityGallons,
        deliveryStates: input.deliveryStates,
        bidDueDate: new Date(input.bidDueDate).toISOString(),
        buyerName,
        vendorEmails: vendorIds.map((id) => ({
          vendorId: id,
          companyName: id,
          email: `vendor@${id}.example.com`,
        })),
      })
    }

    return { ok: true, rfpId }
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from("rfps")
    .insert({
      buyer_id: buyerId,
      title: input.title,
      description: input.description,
      fuel_type: input.fuelType,
      quantity_gallons: input.quantityGallons,
      recurrence: input.recurrence,
      urgency: input.urgency,
      delivery_states: input.deliveryStates,
      delivery_addresses: input.deliveryAddresses.map((a) => a.address),
      delivery_dates: input.deliveryDates,
      required_capabilities: input.requiredCapabilities,
      required_certifications: input.requiredCertifications.filter((c) => c !== "None"),
      insurance_requirements: input.insuranceRequirements ?? null,
      bid_due_date: new Date(input.bidDueDate).toISOString(),
      decision_date: new Date(input.decisionDate).toISOString(),
      expected_award_date: new Date(input.expectedAwardDate).toISOString(),
      status: publish ? "published" : "draft",
      published_at: publish ? now : null,
    })
    .select("id")
    .single()

  if (error || !row) {
    return { ok: false, message: "Could not save RFP." }
  }

  const id = row.id as string

  // Notify the GridLink operator that an RFP was created (draft or published).
  await sendNewRfpNotification({
    rfpId: id,
    rfpTitle: input.title,
    buyerName,
    fuelType: input.fuelType,
    quantityGallons: input.quantityGallons,
    deliveryStates: input.deliveryStates,
    status: publish ? "published" : "draft",
  })

  if (publish) {
    const admin = createAdminClient()
    const invites = vendorIds.map((vendorId) => ({
      rfp_id: id,
      vendor_id: vendorId,
    }))
    await admin.from("rfp_invitations").insert(invites)

    const vendors = await listVerifiedVendors()
    await sendRfpInvitationEmails({
      rfpId: id,
      rfpTitle: input.title,
      fuelType: input.fuelType,
      quantityGallons: input.quantityGallons,
      deliveryStates: input.deliveryStates,
      bidDueDate: new Date(input.bidDueDate).toISOString(),
      buyerName,
      vendorEmails: vendorIds.map((vid) => {
        const v = vendors.find((x) => x.id === vid)
        return {
          vendorId: vid,
          companyName: v?.companyName ?? "Supplier",
          email: `invites+${vid}@gridlink.demo`,
        }
      }),
    })
  }

  return { ok: true, rfpId: id }
}

export async function awardRfpContract(
  buyerId: string,
  rfpId: string,
  vendorId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) {
    const store = getMockStore()
    const rfp = store.rfps.find((r) => r.id === rfpId)
    if (!rfp) return { ok: false, message: "RFP not found." }
    rfp.status = "awarded"
    rfp.awardedVendorId = vendorId
    const responses = store.responses.filter((r) => r.rfpId === rfpId)
    const awardedName = await vendorName(vendorId)
    await sendRfpAwardedEmails({
      rfpTitle: rfp.title,
      buyerName: rfp.buyerName,
      awarded: {
        email: `vendor@${vendorId}.example.com`,
        companyName: awardedName,
      },
      notAwarded: await Promise.all(
        responses
          .filter((r) => r.vendorId !== vendorId)
          .map(async (r) => ({
            email: `vendor@${r.vendorId}.example.com`,
            companyName: await vendorName(r.vendorId),
          }))
      ),
    })
    return { ok: true }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("rfps")
    .update({ status: "awarded", awarded_vendor_id: vendorId })
    .eq("id", rfpId)
    .eq("buyer_id", buyerId)

  if (error) return { ok: false, message: "Could not award contract." }

  const { data: rfp } = await supabase.from("rfps").select("title").eq("id", rfpId).single()
  const { data: respRows } = await supabase.from("rfp_responses").select("vendor_id").eq("rfp_id", rfpId)
  const awardedName = await vendorName(vendorId)
  await sendRfpAwardedEmails({
    rfpTitle: (rfp?.title as string) ?? "RFP",
    buyerName: "Buyer",
    awarded: {
      email: `vendor@${vendorId}.example.com`,
      companyName: awardedName,
    },
    notAwarded: await Promise.all(
      (respRows ?? [])
        .filter((r) => r.vendor_id !== vendorId)
        .map(async (r) => ({
          email: `vendor@${r.vendor_id as string}.example.com`,
          companyName: await vendorName(r.vendor_id as string),
        }))
    ),
  })

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Vendor accessors
// ---------------------------------------------------------------------------
export async function listVendorOpportunities(
  vendorId: string
): Promise<VendorOpportunityListItem[]> {
  if (!isSupabaseConfigured()) {
    const store = getMockStore()
    const invs = store.invitations.filter((i) => i.vendorId === vendorId)
    const items: VendorOpportunityListItem[] = []
    for (const inv of invs) {
      const rfp = store.rfps.find((r) => r.id === inv.rfpId && r.status === "published")
      if (!rfp) continue
      items.push({
        id: rfp.id,
        invitationId: inv.id,
        buyer: rfp.buyerName,
        title: rfp.title,
        fuelType: rfp.fuelType,
        quantityGallons: rfp.quantityGallons,
        states: rfp.deliveryStates,
        dueDate: rfp.bidDueDate ?? rfp.createdAt,
        status: invitationStatus(inv),
        urgency: rfp.urgency,
      })
    }
    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from("rfp_invitations")
    .select("*, rfps(*)")
    .eq("vendor_id", vendorId)

  return (data ?? [])
    .filter((row) => (row.rfps as { status: string })?.status === "published")
    .map((row) => {
      const rfp = row.rfps as Record<string, unknown>
      return {
        id: rfp.id as string,
        invitationId: row.id as string,
        buyer: "Buyer",
        title: rfp.title as string,
        fuelType: (rfp.fuel_type as string) ?? "",
        quantityGallons: Number(rfp.quantity_gallons) || 0,
        states: (rfp.delivery_states as string[]) ?? [],
        dueDate: (rfp.bid_due_date as string) ?? (rfp.created_at as string),
        status: invitationStatus({
          id: row.id as string,
          rfpId: rfp.id as string,
          vendorId,
          invitedAt: row.invited_at as string,
          viewedAt: (row.viewed_at as string) ?? null,
          respondedAt: (row.responded_at as string) ?? null,
          declinedAt: (row.declined_at as string) ?? null,
        }),
        urgency: ((rfp.urgency as string) ?? "standard") as "standard" | "rush" | "emergency",
      }
    })
}

export async function getVendorOpportunityDetail(
  vendorId: string,
  rfpId: string
): Promise<VendorOpportunityDetail | null> {
  if (!isSupabaseConfigured()) {
    const store = getMockStore()
    const inv = store.invitations.find(
      (i) =>
        i.rfpId === rfpId &&
        (i.vendorId === vendorId || vendorId === PREVIEW_VENDOR_ID)
    )
    const rfp = store.rfps.find((r) => r.id === rfpId)
    if (!inv || !rfp) return null

    const resp = store.responses.find(
      (r) => r.rfpId === rfpId && r.vendorId === inv.vendorId
    )

    let existingResponse: RfpResponseView | null = null
    if (resp) {
      existingResponse = {
        id: resp.id,
        vendorId: resp.vendorId,
        companyName: await vendorName(resp.vendorId),
        pricePerGallon: resp.pricePerGallon,
        totalPrice: resp.totalPrice,
        deliveryTerms: resp.deliveryTerms,
        validityDays: resp.validityDays,
        notes: resp.notes,
        submittedAt: resp.submittedAt,
        status: resp.status,
      }
    }

    return {
      id: rfp.id,
      invitationId: inv.id,
      buyer: rfp.buyerName,
      title: rfp.title,
      description: rfp.description,
      fuelType: rfp.fuelType,
      quantityGallons: rfp.quantityGallons,
      deliveryStates: rfp.deliveryStates,
      deliveryAddresses: rfp.deliveryAddresses,
      deliveryDates: rfp.deliveryDates,
      requiredCapabilities: rfp.requiredCapabilities,
      requiredCertifications: rfp.requiredCertifications,
      insuranceRequirements: rfp.insuranceRequirements,
      bidDueDate: rfp.bidDueDate ?? rfp.createdAt,
      status: invitationStatus(inv),
      urgency: rfp.urgency,
      existingResponse,
    }
  }

  const supabase = await createClient()
  const { data: inv } = await supabase
    .from("rfp_invitations")
    .select("*, rfps(*)")
    .eq("rfp_id", rfpId)
    .eq("vendor_id", vendorId)
    .maybeSingle()

  if (!inv) return null
  const rfp = inv.rfps as Record<string, unknown>

  const { data: resp } = await supabase
    .from("rfp_responses")
    .select("*")
    .eq("rfp_id", rfpId)
    .eq("vendor_id", vendorId)
    .maybeSingle()

  let existingResponse: RfpResponseView | null = null
  if (resp) {
    existingResponse = {
      id: resp.id as string,
      vendorId,
      companyName: await vendorName(vendorId),
      pricePerGallon: Number(resp.price_per_gallon),
      totalPrice: Number(resp.total_price),
      deliveryTerms: (resp.delivery_terms as string) ?? "",
      validityDays: (resp.validity_days as number) ?? 0,
      notes: (resp.notes as string) ?? null,
      submittedAt: resp.submitted_at as string,
      status: resp.status as string,
    }
  }

  return {
    id: rfp.id as string,
    invitationId: inv.id as string,
    buyer: "Buyer",
    title: rfp.title as string,
    description: (rfp.description as string) ?? "",
    fuelType: (rfp.fuel_type as string) ?? "",
    quantityGallons: Number(rfp.quantity_gallons) || 0,
    deliveryStates: (rfp.delivery_states as string[]) ?? [],
    deliveryAddresses: (rfp.delivery_addresses as string[]) ?? [],
    deliveryDates: ((rfp.delivery_dates as string[]) ?? []).map(String),
    requiredCapabilities: (rfp.required_capabilities as string[]) ?? [],
    requiredCertifications: (rfp.required_certifications as string[]) ?? [],
    insuranceRequirements: (rfp.insurance_requirements as string) ?? null,
    bidDueDate: (rfp.bid_due_date as string) ?? (rfp.created_at as string),
    status: invitationStatus({
      id: inv.id as string,
      rfpId,
      vendorId,
      invitedAt: inv.invited_at as string,
      viewedAt: (inv.viewed_at as string) ?? null,
      respondedAt: (inv.responded_at as string) ?? null,
      declinedAt: (inv.declined_at as string) ?? null,
    }),
    urgency: ((rfp.urgency as string) ?? "standard") as "standard" | "rush" | "emergency",
    existingResponse,
  }
}

export async function markInvitationViewed(vendorId: string, rfpId: string) {
  if (!isSupabaseConfigured()) {
    const store = getMockStore()
    const inv = store.invitations.find(
      (i) =>
        i.rfpId === rfpId &&
        (i.vendorId === vendorId || vendorId === PREVIEW_VENDOR_ID) &&
        !i.viewedAt &&
        !i.declinedAt
    )
    if (inv) inv.viewedAt = new Date().toISOString()
    return
  }

  const supabase = await createClient()
  await supabase
    .from("rfp_invitations")
    .update({ viewed_at: new Date().toISOString() })
    .eq("rfp_id", rfpId)
    .eq("vendor_id", vendorId)
    .is("viewed_at", null)
}

export async function submitVendorBid(
  vendorId: string,
  rfpId: string,
  input: RfpBidInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const now = new Date().toISOString()

  if (!isSupabaseConfigured()) {
    const store = getMockStore()
    const inv = store.invitations.find(
      (i) =>
        i.rfpId === rfpId &&
        (i.vendorId === vendorId || vendorId === PREVIEW_VENDOR_ID)
    )
    if (!inv) return { ok: false, message: "Invitation not found." }
    if (inv.declinedAt) return { ok: false, message: "You declined this opportunity." }

    const vid = inv.vendorId
    store.responses.push({
      id: `resp-${Date.now()}`,
      rfpId,
      vendorId: vid,
      pricePerGallon: input.pricePerGallon,
      totalPrice: input.totalPrice,
      deliveryTerms: input.deliveryTerms,
      validityDays: input.validityDays,
      notes: input.notes ?? (input.attachmentName ? `Attachment: ${input.attachmentName}` : null),
      submittedAt: now,
      status: "submitted",
    })
    inv.respondedAt = now

    const rfp = store.rfps.find((r) => r.id === rfpId)
    await sendBidSubmittedEmail({
      buyerEmail: "buyer@metro.demo",
      rfpTitle: rfp?.title ?? "RFP",
      vendorName: await vendorName(vid),
    })
    return { ok: true }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("rfp_responses").upsert({
    rfp_id: rfpId,
    vendor_id: vendorId,
    price_per_gallon: input.pricePerGallon,
    total_price: input.totalPrice,
    delivery_terms: input.deliveryTerms,
    validity_days: input.validityDays,
    notes: input.notes ?? null,
    attachment_name: input.attachmentName ?? null,
    submitted_at: now,
    status: "submitted",
  })

  if (error) return { ok: false, message: "Could not submit bid." }

  await supabase
    .from("rfp_invitations")
    .update({ responded_at: now })
    .eq("rfp_id", rfpId)
    .eq("vendor_id", vendorId)

  return { ok: true }
}

export async function declineVendorInvitation(
  vendorId: string,
  rfpId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const now = new Date().toISOString()

  if (!isSupabaseConfigured()) {
    const store = getMockStore()
    const inv = store.invitations.find(
      (i) =>
        i.rfpId === rfpId &&
        (i.vendorId === vendorId || vendorId === PREVIEW_VENDOR_ID)
    )
    if (!inv) return { ok: false, message: "Invitation not found." }
    inv.declinedAt = now
    return { ok: true }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("rfp_invitations")
    .update({ declined_at: now })
    .eq("rfp_id", rfpId)
    .eq("vendor_id", vendorId)

  if (error) return { ok: false, message: "Could not decline." }
  return { ok: true }
}

export async function resolveVendorIdForSession(
  profileId: string,
  preview: boolean
): Promise<string> {
  if (preview || !isSupabaseConfigured()) return PREVIEW_VENDOR_ID

  const supabase = await createClient()
  const { data } = await supabase
    .from("vendors")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle()

  return (data?.id as string) ?? PREVIEW_VENDOR_ID
}
