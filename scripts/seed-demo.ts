/**
 * GridLink demo seed — idempotent via is_demo flag.
 *
 * Usage:  npx tsx scripts/seed-demo.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Run migration 0005_demo_flag.sql first.
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import ws from "ws"

// Node < 22 has no native WebSocket; supabase-js realtime needs one at init.
if (typeof globalThis.WebSocket === "undefined") {
  ;(globalThis as Record<string, unknown>).WebSocket = ws
}

import {
  APPLICATION_DEFS,
  BUYERS,
  DEMO_PASSWORD,
  MONITOR_CAP,
  TICKET_CAP,
  VENDOR_DEFS,
  WET_HOSE_CAP,
} from "./seed-demo-data"

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) {
    console.error("Missing .env.local — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }
  const content = readFileSync(envPath, "utf8")
  for (const line of content.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    console.error(
      "Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (real Supabase project)."
    )
    process.exit(1)
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// NOTE: ids must be valid UUIDs — every character between the dashes must be
// hex (0-9, a-f). Earlier prefixes 'v'/'r'/'o' were rejected by Postgres, so the
// vendor/rfp/org upserts silently failed. Use distinct hex prefixes instead.
function vendorId(i: number) {
  return `d1000001-0001-4001-8001-${String(i + 1).padStart(12, "0")}`
}
function appId(i: number) {
  return `a1000001-0001-4001-8001-${String(i + 1).padStart(12, "0")}`
}
function rfpId(i: number) {
  return `e1000001-0001-4001-8001-${String(i + 1).padStart(12, "0")}`
}
function orgId(i: number) {
  return `c1000001-0001-4001-8001-${String(i + 1).padStart(12, "0")}`
}

function daysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function daysAgo(days: number) {
  return daysFromNow(-days)
}

function capabilities(wetHose: boolean, index: number) {
  const caps = [TICKET_CAP]
  if (wetHose) caps.unshift(WET_HOSE_CAP)
  if (index % 2 === 0) caps.push(MONITOR_CAP)
  return caps
}

// ---------------------------------------------------------------------------
// Clear demo data (idempotent)
// ---------------------------------------------------------------------------
async function clearDemoData(sb: ReturnType<typeof supabaseAdmin>) {
  console.log("Clearing existing demo data…")

  const { data: demoRfps } = await sb.from("rfps").select("id").eq("is_demo", true)
  const rfpIds = (demoRfps ?? []).map((r) => r.id as string)

  if (rfpIds.length) {
    await sb.from("rfp_responses").delete().in("rfp_id", rfpIds)
    await sb.from("rfp_invitations").delete().in("rfp_id", rfpIds)
    await sb.from("rfps").delete().eq("is_demo", true)
  } else {
    await sb.from("rfps").delete().eq("is_demo", true)
  }

  const { data: demoVendors } = await sb.from("vendors").select("id").eq("is_demo", true)
  const vendorIds = (demoVendors ?? []).map((v) => v.id as string)

  if (vendorIds.length) {
    await sb.from("opportunity_notifications").delete().in("vendor_id", vendorIds)
    await sb.from("vendor_documents").delete().in("vendor_id", vendorIds)
    await sb.from("vendor_capabilities").delete().in("vendor_id", vendorIds)
  }
  await sb.from("vendors").delete().eq("is_demo", true)

  const { data: demoApps } = await sb.from("vendor_applications").select("id").eq("is_demo", true)
  const appIds = (demoApps ?? []).map((a) => a.id as string)
  if (appIds.length) {
    await sb.from("application_activity_log").delete().in("application_id", appIds)
  }
  await sb.from("vendor_applications").delete().eq("is_demo", true)

  await sb.from("buyer_applications").delete().eq("is_demo", true)

  await sb.from("buyer_organizations").delete().eq("is_demo", true)

  // Only remove demo *buyer* logins here — seedBuyers recreates them. The admin
  // and vendor demo logins are managed by create-demo-logins.ts; deleting them
  // here would lock you out after every reseed.
  const { data: demoProfiles } = await sb
    .from("profiles")
    .select("id")
    .eq("is_demo", true)
    .eq("role", "buyer")
  for (const p of demoProfiles ?? []) {
    await sb.auth.admin.deleteUser(p.id as string)
  }

  console.log("  Demo data cleared.")
}

// ---------------------------------------------------------------------------
// Seed buyers
// ---------------------------------------------------------------------------
async function seedBuyers(sb: ReturnType<typeof supabaseAdmin>) {
  console.log("Seeding 5 buyer organizations…")
  const buyerIds: string[] = []

  for (let i = 0; i < BUYERS.length; i++) {
    const b = BUYERS[i]
    const { data: list } = await sb.auth.admin.listUsers()
    const found = list?.users?.find((u) => u.email === b.email)

    let userId: string
    if (found) {
      userId = found.id
      await sb.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD })
    } else {
      const { data: created, error } = await sb.auth.admin.createUser({
        email: b.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { role: "buyer", company_name: b.companyName },
      })
      if (error) throw new Error(`Buyer user ${b.email}: ${error.message}`)
      userId = created!.user!.id
    }

    await sb.from("profiles").upsert({
      id: userId,
      role: "buyer",
      full_name: b.fullName,
      company_name: b.companyName,
      is_demo: true,
    })

    await sb.from("buyer_organizations").upsert({
      id: orgId(i),
      name: b.orgName,
      industry: b.industry,
      primary_contact_id: userId,
      is_demo: true,
    })

    buyerIds.push(userId)
  }

  return buyerIds
}

// ---------------------------------------------------------------------------
// Seed vendors
// ---------------------------------------------------------------------------
async function seedVendors(sb: ReturnType<typeof supabaseAdmin>) {
  console.log("Seeding 30 verified vendors…")
  const ids: string[] = []

  for (let i = 0; i < VENDOR_DEFS.length; i++) {
    const v = VENDOR_DEFS[i]
    const id = vendorId(i)
    ids.push(id)

    const caps = capabilities(v.wetHose, i)
    const desc = `${v.companyName} is a ${v.nationwide ? "nationwide" : "regional"} fuel distributor headquartered in ${v.stateInc}, serving enterprise buyers with ${v.products.slice(0, 3).join(", ")} and related products.`

    await sb.from("vendors").upsert({
      id,
      is_demo: true,
      is_verified: true,
      verified_at: daysAgo(30 + (i % 60)),
      company_name: v.companyName,
      description: desc,
      corporate_address: `1200 Industrial Blvd, ${v.stateInc}`,
      state_of_incorporation: v.stateInc,
      entity_type: "LLC",
      organization_type: ["Supplier", "Transportation/Company Trucks"],
      special_certification: v.cert,
      nationwide: v.nationwide,
      us_dot_number: `${2380000 + i}`,
      website_url: `https://www.${v.slug}.example.com`,
      year_founded: 1985 + (i % 30),
      products_offered: [...v.products],
      brands_offered: "Shell, Chevron, Exxon",
      delivery_capabilities: caps,
      additional_services: ["Utilize dispatch/scheduling software", "Able to accept orders via email notification"],
      licensed_states: [...v.states],
      tankwagons_count: v.tankwagons,
      transports_count: v.transports,
      annual_gallons_distributed: v.annualGallons,
      standard_order_lead_time: "24–48 hours",
      emergency_order_lead_time: v.emergency,
      emergency_response_times: v.emergency,
    })
  }

  return ids
}

// ---------------------------------------------------------------------------
// Seed applications
// ---------------------------------------------------------------------------
async function seedApplications(
  sb: ReturnType<typeof supabaseAdmin>,
  vendorIds: string[]
) {
  console.log("Seeding 15 vendor applications…")

  for (let i = 0; i < APPLICATION_DEFS.length; i++) {
    const def = APPLICATION_DEFS[i]
    const id = appId(i)
    const vDef =
      "vendorIndex" in def && def.vendorIndex != null ? VENDOR_DEFS[def.vendorIndex] : null

    const rep = vDef?.rep ?? {
      first: "Alex",
      last: "Morgan",
      email: `contact@${def.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example.com`,
    }

    const row: Record<string, unknown> = {
      id,
      is_demo: true,
      invitation_token: `demo-app-token-${String(i + 1).padStart(4, "0")}`,
      status: def.status,
      source: def.source,
      submitted_at: def.status !== "pending_review" || i < 8 ? daysAgo(14 - i) : null,
      reviewed_at: ["approved", "rejected", "info_requested"].includes(def.status)
        ? daysAgo(3)
        : null,
      company_name: def.companyName,
      description: `Application for ${def.companyName} to join the GridLink Verified network.`,
      corporate_address: "100 Commerce Dr, Demo City, ST 00000",
      state_of_incorporation: "Illinois",
      entity_type: "LLC",
      organization_type: ["Supplier"],
      special_certification: null,
      nationwide: false,
      licensed_states: ["Illinois", "Indiana"],
      products_offered: ["Diesel", "Gas"],
      delivery_capabilities: [TICKET_CAP],
      sales_rep_first_name: rep.first,
      sales_rep_last_name: rep.last,
      sales_rep_email: rep.email,
      sales_rep_phone: "(555) 010-0000",
      dispatch_contact_name: "Dispatch Desk",
      dispatch_email: `dispatch@${def.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`,
      dispatch_phone: "(555) 010-0001",
      emergency_dispatch_name: "24/7 Ops",
      emergency_dispatch_email: `emergency@${def.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`,
      emergency_dispatch_phone: "(555) 010-0099",
      billing_address: "100 Commerce Dr",
      billing_contact_name: "Accounts Payable",
      billing_email: `billing@${def.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`,
      billing_phone: "(555) 010-0002",
      tankwagons_count: 5,
      transports_count: 8,
      annual_gallons_distributed: 5_000_000,
      standard_order_lead_time: "48 hours",
      documents: {},
    }

    await sb.from("vendor_applications").upsert(row)

    if (def.status === "approved" && "vendorIndex" in def && def.vendorIndex != null) {
      const vid = vendorIds[def.vendorIndex]
      await sb.from("vendors").update({ application_id: id }).eq("id", vid)
    }

    if (def.status === "info_requested") {
      await sb.from("application_activity_log").insert({
        application_id: id,
        action: "info_requested",
        notes: "Please upload an updated Certificate of Insurance showing $2M general liability.",
      })
    }
    if (def.status === "rejected") {
      await sb.from("application_activity_log").insert({
        application_id: id,
        action: "rejected",
        notes: "Coverage area does not meet current network requirements.",
      })
    }
    if (def.status === "approved") {
      await sb.from("application_activity_log").insert({
        application_id: id,
        action: "approved",
        notes: "Approved for GridLink Verified directory.",
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Seed RFPs
// ---------------------------------------------------------------------------
type RfpSeed = {
  title: string
  description: string
  fuelType: string
  quantityGallons: number
  states: string[]
  status: "draft" | "published" | "closed" | "awarded"
  buyerIndex: number
  urgency?: string
  recurrence?: string
  inviteVendorIndices: number[]
  responses?: { vendorIndex: number; ppg: number }[]
  awardedVendorIndex?: number
}

const RFP_SEEDS: RfpSeed[] = [
  {
    title: "Hospital Campus Diesel & DEF — FY26",
    description: "Annual diesel and DEF for Mercy Regional acute-care campuses and MOBs.",
    fuelType: "Diesel",
    quantityGallons: 1_200_000,
    states: ["Minnesota", "Wisconsin"],
    status: "draft",
    buyerIndex: 0,
    inviteVendorIndices: [0, 6, 9, 22],
  },
  {
    title: "Fleet Card Gasoline — Municipal Yards",
    description: "Unleaded and premium for city fleet yards and equipment.",
    fuelType: "Gas",
    quantityGallons: 450_000,
    states: ["Ohio"],
    status: "draft",
    buyerIndex: 1,
    inviteVendorIndices: [10, 11, 16],
  },
  {
    title: "Propane — Remote Water Facilities (Draft)",
    description: "Propane for remote pumping stations — scope finalizing.",
    fuelType: "Propane",
    quantityGallons: 80_000,
    states: ["Colorado"],
    status: "draft",
    buyerIndex: 1,
    inviteVendorIndices: [3, 16],
  },
  {
    title: "Bulk Diesel & DEF — Transit Fleet FY27",
    description: "On-road diesel and DEF for 340 transit coaches and support vehicles.",
    fuelType: "Diesel",
    quantityGallons: 2_400_000,
    states: ["Minnesota"],
    status: "published",
    buyerIndex: 0,
    urgency: "standard",
    inviteVendorIndices: [0, 6, 9, 22, 26],
    responses: [
      { vendorIndex: 0, ppg: 3.42 },
      { vendorIndex: 6, ppg: 3.28 },
      { vendorIndex: 9, ppg: 3.51 },
      { vendorIndex: 22, ppg: 3.39 },
    ],
  },
  {
    title: "Unleaded & Premium — Logistics Hub Network",
    description: "Gasoline for 12 regional logistics hubs and linehaul tractors.",
    fuelType: "Gas",
    quantityGallons: 1_800_000,
    states: ["Illinois", "Indiana", "Missouri"],
    status: "published",
    buyerIndex: 2,
    inviteVendorIndices: [0, 14, 18, 21],
    responses: [
      { vendorIndex: 0, ppg: 3.18 },
      { vendorIndex: 14, ppg: 3.12 },
      { vendorIndex: 18, ppg: 3.22 },
    ],
  },
  {
    title: "Food Plant Dyed Diesel + Heating Oil",
    description: "Dyed diesel for generators and heating oil for processing steam.",
    fuelType: "Dyed Diesel",
    quantityGallons: 920_000,
    states: ["Iowa", "Nebraska"],
    status: "published",
    buyerIndex: 3,
    inviteVendorIndices: [6, 7, 16, 25],
    responses: [
      { vendorIndex: 6, ppg: 3.35 },
      { vendorIndex: 7, ppg: 3.29 },
      { vendorIndex: 25, ppg: 3.44 },
      { vendorIndex: 16, ppg: 3.38 },
      { vendorIndex: 0, ppg: 3.41 },
    ],
  },
  {
    title: "Jet Fuel & Diesel — Airport Ground Support",
    description: "Jet A and diesel for GSE, deicing support, and airport fleet.",
    fuelType: "Jet Fuel",
    quantityGallons: 3_100_000,
    states: ["Texas", "Louisiana"],
    status: "published",
    buyerIndex: 4,
    urgency: "rush",
    inviteVendorIndices: [2, 23, 5, 12],
    responses: [
      { vendorIndex: 23, ppg: 4.85 },
      { vendorIndex: 2, ppg: 4.92 },
      { vendorIndex: 5, ppg: 5.01 },
    ],
  },
  {
    title: "Renewable Diesel Pilot — Manufacturing",
    description: "R99 renewable diesel trial at three plant locations.",
    fuelType: "Renewable Fuel",
    quantityGallons: 200_000,
    states: ["California", "Oregon"],
    status: "closed",
    buyerIndex: 3,
    inviteVendorIndices: [5, 21],
    responses: [
      { vendorIndex: 5, ppg: 4.15 },
      { vendorIndex: 21, ppg: 4.08 },
    ],
  },
  {
    title: "Marine Diesel — Port Authority Q3",
    description: "Marine gas oil for harbor tugs and workboats.",
    fuelType: "Marine Fuel",
    quantityGallons: 640_000,
    states: ["Maryland", "Virginia"],
    status: "closed",
    buyerIndex: 1,
    inviteVendorIndices: [19, 2, 7],
    responses: [
      { vendorIndex: 19, ppg: 3.55 },
      { vendorIndex: 7, ppg: 3.62 },
    ],
  },
  {
    title: "Heating Oil & Diesel — Campus Facilities (Awarded)",
    description: "Annual campus thermal and fleet diesel — contract awarded.",
    fuelType: "Diesel",
    quantityGallons: 880_000,
    states: ["Wisconsin"],
    status: "awarded",
    buyerIndex: 0,
    inviteVendorIndices: [6, 9, 22, 26],
    responses: [
      { vendorIndex: 6, ppg: 3.31 },
      { vendorIndex: 9, ppg: 3.45 },
      { vendorIndex: 22, ppg: 3.38 },
    ],
    awardedVendorIndex: 6,
  },
]

async function seedRfps(
  sb: ReturnType<typeof supabaseAdmin>,
  buyerIds: string[],
  vendorIds: string[]
) {
  console.log("Seeding 10 RFPs with invitations and responses…")

  for (let i = 0; i < RFP_SEEDS.length; i++) {
    const r = RFP_SEEDS[i]
    const id = rfpId(i)
    const buyerId = buyerIds[r.buyerIndex]
    const published = r.status !== "draft"
    const awardedId =
      r.awardedVendorIndex != null ? vendorIds[r.awardedVendorIndex] : null

    await sb.from("rfps").upsert({
      id,
      is_demo: true,
      buyer_id: buyerId,
      title: r.title,
      description: r.description,
      fuel_type: r.fuelType,
      quantity_gallons: r.quantityGallons,
      delivery_states: r.states,
      delivery_addresses: [`Primary delivery — ${r.states[0]}`],
      delivery_dates: [daysFromNow(30).slice(0, 10)],
      required_capabilities: r.fuelType.includes("Jet") ? [] : [WET_HOSE_CAP],
      required_certifications: [],
      insurance_requirements: "$2M general liability",
      bid_due_date: daysFromNow(published ? 14 : 45),
      decision_date: daysFromNow(published ? 21 : 52),
      expected_award_date: daysFromNow(published ? 28 : 60),
      status: r.status,
      awarded_vendor_id: awardedId,
      recurrence: r.recurrence ?? "one_time",
      urgency: r.urgency ?? "standard",
      published_at: published ? daysAgo(5 + i) : null,
      created_at: daysAgo(20 + i),
    })

    if (!published) continue

    const invitedAt = daysAgo(4 + i)
    for (const vi of r.inviteVendorIndices) {
      const vid = vendorIds[vi]
      const hasResponse = r.responses?.some((x) => x.vendorIndex === vi)
      await sb.from("rfp_invitations").insert({
        rfp_id: id,
        vendor_id: vid,
        invited_at: invitedAt,
        viewed_at: hasResponse ? daysAgo(3) : null,
        responded_at: hasResponse ? daysAgo(2) : null,
      })
    }

    if (r.responses) {
      for (const resp of r.responses) {
        const vid = vendorIds[resp.vendorIndex]
        const total = Math.round(resp.ppg * r.quantityGallons * 100) / 100
        await sb.from("rfp_responses").insert({
          rfp_id: id,
          vendor_id: vid,
          price_per_gallon: resp.ppg,
          total_price: total,
          delivery_terms: "Delivered, net 30",
          validity_days: 30,
          notes: null,
          submitted_at: daysAgo(2),
          status: "submitted",
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Buyer access requests (the admin approval queue)
// ---------------------------------------------------------------------------
const BUYER_APPLICATIONS = [
  {
    fullName: "Jordan Kim",
    companyName: "Metro Transit Authority",
    email: "procurement@metrotransit.example.com",
    phone: "(612) 555-0117",
    industry: "Logistics & Transportation",
    estimatedVolume: "5M – 25M gal/yr",
    useCase:
      "900-vehicle transit fleet; consolidate diesel + DEF sourcing and automate compliance.",
    status: "pending_review" as const,
  },
  {
    fullName: "Alicia Romero",
    companyName: "Mercy Regional Health",
    email: "facilities@mercyregional.example.com",
    phone: "(414) 555-0143",
    industry: "Healthcare / Hospital",
    estimatedVolume: "1M – 5M gal/yr",
    useCase:
      "Backup generator fuel and heating oil across 6 hospital campuses; need verified emergency-response suppliers.",
    status: "pending_review" as const,
  },
  {
    fullName: "Dev Patel",
    companyName: "Harvest Foods Co.",
    email: "energy@harvestfoods.example.com",
    phone: "(515) 555-0190",
    industry: "Food & Agriculture",
    estimatedVolume: "25M+ gal/yr",
    useCase: "Multi-plant manufacturer sourcing diesel and propane nationwide.",
    status: "approved" as const,
  },
  {
    fullName: "Morgan Lee",
    companyName: "Skyport Aviation Services",
    email: "ops@skyport.example.com",
    phone: "(305) 555-0166",
    industry: "Aviation / Airport",
    estimatedVolume: "< 100K gal/yr",
    useCase: "Small FBO exploring jet fuel options.",
    status: "rejected" as const,
  },
]

async function seedBuyerApplications(sb: ReturnType<typeof supabaseAdmin>) {
  console.log(`Seeding ${BUYER_APPLICATIONS.length} buyer access requests…`)
  for (let i = 0; i < BUYER_APPLICATIONS.length; i++) {
    const b = BUYER_APPLICATIONS[i]
    const reviewed = b.status !== "pending_review"
    await sb.from("buyer_applications").insert({
      is_demo: true,
      full_name: b.fullName,
      company_name: b.companyName,
      email: b.email,
      phone: b.phone,
      industry: b.industry,
      estimated_volume: b.estimatedVolume,
      use_case: b.useCase,
      status: b.status,
      submitted_at: daysAgo(5 + i),
      reviewed_at: reviewed ? daysAgo(2 + i) : null,
    })
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  loadEnv()
  const sb = supabaseAdmin()

  console.log("\nGridLink demo seed\n")

  await clearDemoData(sb)
  const buyerIds = await seedBuyers(sb)
  const vendorIds = await seedVendors(sb)
  await seedApplications(sb, vendorIds)
  await seedBuyerApplications(sb)
  await seedRfps(sb, buyerIds, vendorIds)

  console.log("\nDemo seed complete.\n")
  console.log("Buyer logins (password for all):", DEMO_PASSWORD)
  for (const b of BUYERS) {
    console.log(`  • ${b.email}`)
  }
  console.log("\nVerified vendors: 30 (is_demo=true)")
  console.log("Applications: 15 | RFPs: 10\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
