/**
 * GridLink — seed contracts, invoices, and payments for the demo.
 *
 * Creates historical *awarded* RFPs (is_demo) for the demo buyers, awards them
 * to demo vendors (the demo supplier login gets several), then builds ~6 months
 * of invoice history across every status so both dashboards look alive.
 *
 * Usage:  npx tsx scripts/seed-invoices.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Run AFTER seed-demo.ts and create-demo-logins.ts. Idempotent: clears demo
 * invoicing rows first.
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import ws from "ws"

if (typeof globalThis.WebSocket === "undefined") {
  ;(globalThis as Record<string, unknown>).WebSocket = ws
}

import { BUYERS } from "./seed-demo-data"

const VENDOR_LOGIN_EMAIL = "vendor@gridlink-demo.example.com"

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) {
    console.error("Missing .env.local")
    process.exit(1)
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!process.env[key]) process.env[key] = val
  }
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
type SB = ReturnType<typeof admin>

const r2 = (n: number) => Math.round(n * 100) / 100
const iso = (d: Date) => d.toISOString().slice(0, 10)
function daysAgo(n: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d
}
function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + n)
  return x
}
function prefix(name: string) {
  const words = name.replace(/[^A-Za-z ]/g, "").trim().split(/\s+/).filter(Boolean)
  const letters = words.length >= 2 ? words.slice(0, 3).map((w) => w[0]).join("") : (words[0] ?? "INV").slice(0, 3)
  return letters.toUpperCase()
}

// Deterministic ids so re-runs upsert cleanly.
const rfpId = (i: number) => `e1000001-0001-4001-8001-${String(i + 1).padStart(12, "0")}`
const contractId = (i: number) => `e2000001-0001-4001-8001-${String(i + 1).padStart(12, "0")}`

interface ContractSeed {
  key: number
  buyerIndex: number
  vendor: "login" | number // "login" = the demo supplier account's vendor, number = nth other vendor
  title: string
  fuelType: string
  gallons: number
  ppg: number
  netDays: number
  awardedDaysAgo: number
  states: string[]
  /** monthly deliveries (gallons per invoice) + fee/tax profile */
  perInvoiceGallons: number
  cadenceDays: number
  fee?: number
  taxPerGal?: number
}

const CONTRACTS: ContractSeed[] = [
  { key: 0, buyerIndex: 0, vendor: "login", title: "Backup Generator Diesel — Hospital Campuses FY26", fuelType: "Diesel", gallons: 480_000, ppg: 3.41, netDays: 30, awardedDaysAgo: 200, states: ["Minnesota", "Wisconsin"], perInvoiceGallons: 38_000, cadenceDays: 30, fee: 350, taxPerGal: 0.03 },
  { key: 1, buyerIndex: 2, vendor: "login", title: "Linehaul Diesel — Midwest Hubs", fuelType: "Diesel", gallons: 1_200_000, ppg: 3.29, netDays: 45, awardedDaysAgo: 170, states: ["Illinois", "Indiana"], perInvoiceGallons: 95_000, cadenceDays: 30, fee: 500 },
  { key: 2, buyerIndex: 4, vendor: "login", title: "Ground Support Diesel — Terminal Ops", fuelType: "Diesel", gallons: 300_000, ppg: 3.58, netDays: 30, awardedDaysAgo: 120, states: ["Texas"], perInvoiceGallons: 42_000, cadenceDays: 30, taxPerGal: 0.02 },
  { key: 3, buyerIndex: 0, vendor: 0, title: "DEF Supply — Mercy Fleet", fuelType: "DEF", gallons: 60_000, ppg: 2.85, netDays: 30, awardedDaysAgo: 150, states: ["Minnesota"], perInvoiceGallons: 9_000, cadenceDays: 30 },
  { key: 4, buyerIndex: 0, vendor: 1, title: "Heating Oil — Clinic Network", fuelType: "Heating Oil", gallons: 120_000, ppg: 3.12, netDays: 30, awardedDaysAgo: 110, states: ["Wisconsin"], perInvoiceGallons: 20_000, cadenceDays: 30, fee: 250 },
  { key: 5, buyerIndex: 1, vendor: 2, title: "Plow Fleet Diesel — Winter Ops", fuelType: "Diesel", gallons: 250_000, ppg: 3.35, netDays: 30, awardedDaysAgo: 90, states: ["Ohio"], perInvoiceGallons: 45_000, cadenceDays: 30 },
  { key: 7, buyerIndex: 0, vendor: "login", title: "Renewable Diesel R99 — Hospital Shuttle Fleet", fuelType: "Renewable Diesel", gallons: 150_000, ppg: 4.05, netDays: 30, awardedDaysAgo: 130, states: ["Minnesota"], perInvoiceGallons: 22_000, cadenceDays: 30, fee: 200 },
  { key: 6, buyerIndex: 3, vendor: 3, title: "Dyed Diesel — Processing Plants", fuelType: "Dyed Diesel", gallons: 400_000, ppg: 3.22, netDays: 45, awardedDaysAgo: 140, states: ["Iowa"], perInvoiceGallons: 60_000, cadenceDays: 30, taxPerGal: 0.01 },
]

async function clear(sb: SB) {
  console.log("Clearing demo invoicing data…")
  const { data: invs } = await sb.from("invoices").select("id").eq("is_demo", true)
  const ids = (invs ?? []).map((i) => i.id as string)
  if (ids.length) {
    await sb.from("invoice_events").delete().in("invoice_id", ids)
    await sb.from("payments").delete().in("invoice_id", ids)
    await sb.from("invoice_line_items").delete().in("invoice_id", ids)
    await sb.from("invoices").delete().in("id", ids)
  }
  await sb.from("supplier_ratings").delete().eq("is_demo", true)
  await sb.from("messages").delete().eq("is_demo", true)
  await sb.from("deliveries").delete().eq("is_demo", true)
  await sb.from("orders").delete().eq("is_demo", true)
  const { data: cons } = await sb.from("contracts").select("id, vendor_id").eq("is_demo", true)
  if (cons?.length) {
    await sb.from("contracts").delete().eq("is_demo", true)
    await sb.from("invoice_counters").delete().in("vendor_id", [...new Set(cons.map((c) => c.vendor_id as string))])
  }
  const seededRfps = CONTRACTS.map((c) => rfpId(c.key))
  await sb.from("rfp_responses").delete().in("rfp_id", seededRfps)
  await sb.from("rfp_invitations").delete().in("rfp_id", seededRfps)
  await sb.from("rfps").delete().in("id", seededRfps)
}

async function resolveParties(sb: SB) {
  const { data: users } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const byEmail = new Map((users?.users ?? []).map((u) => [u.email, u.id]))

  const buyerIds = BUYERS.map((b) => {
    const id = byEmail.get(b.email)
    if (!id) throw new Error(`Buyer login ${b.email} not found — run seed-demo.ts first`)
    return id
  })

  const vendorProfileId = byEmail.get(VENDOR_LOGIN_EMAIL)
  if (!vendorProfileId) throw new Error(`Vendor login ${VENDOR_LOGIN_EMAIL} not found — run create-demo-logins.ts first`)
  const { data: loginVendor } = await sb.from("vendors").select("id, company_name").eq("profile_id", vendorProfileId).maybeSingle()
  if (!loginVendor) throw new Error("Vendor login is not linked to a vendor record")

  const { data: others } = await sb
    .from("vendors")
    .select("id, company_name")
    .eq("is_demo", true)
    .neq("id", loginVendor.id)
    .order("company_name")
    .limit(6)

  return {
    buyerIds,
    loginVendor: { id: loginVendor.id as string, name: loginVendor.company_name as string },
    otherVendors: (others ?? []).map((v) => ({ id: v.id as string, name: v.company_name as string })),
  }
}

// Saved delivery sites per demo buyer (feeds the RFP wizard's address picker).
const SITES: Record<number, { name: string; address: string; state: string }[]> = {
  0: [
    { name: "Mercy Main Campus — Central Plant", address: "2450 Riverside Ave, Minneapolis, MN 55454", state: "Minnesota" },
    { name: "Mercy North — Generator Yard", address: "3300 Oakdale Ave N, Robbinsdale, MN 55422", state: "Minnesota" },
    { name: "Mercy East — Loading Dock B", address: "1575 Beam Ave, Maplewood, MN 55109", state: "Minnesota" },
    { name: "Eau Claire Clinic — Tank Farm", address: "900 W Clairemont Ave, Eau Claire, WI 54701", state: "Wisconsin" },
  ],
  1: [
    { name: "Public Works Yard 1", address: "12650 Detroit Ave, Lakewood, OH 44107", state: "Ohio" },
    { name: "Salt Barn / Plow Depot", address: "1699 Warren Rd, Lakewood, OH 44107", state: "Ohio" },
  ],
  2: [
    { name: "Chicago Hub", address: "4501 W 47th St, Chicago, IL 60632", state: "Illinois" },
    { name: "Indianapolis Hub", address: "5250 W 74th St, Indianapolis, IN 46268", state: "Indiana" },
    { name: "St. Louis Hub", address: "8000 Hall St, St. Louis, MO 63147", state: "Missouri" },
  ],
  3: [
    { name: "Des Moines Plant", address: "2100 SE Hulsizer Rd, Ankeny, IA 50021", state: "Iowa" },
    { name: "Lincoln Plant", address: "4400 S 84th St, Lincoln, NE 68516", state: "Nebraska" },
  ],
  4: [
    { name: "Terminal 1 — GSE Fuel Farm", address: "2800 N Terminal Rd, Houston, TX 77032", state: "Texas" },
    { name: "Cargo Ramp — South", address: "3000 N Terminal Rd, Houston, TX 77032", state: "Texas" },
  ],
}

async function seedSites(sb: SB, buyerIds: string[]) {
  await sb.from("buyer_sites").delete().eq("is_demo", true)
  let n = 0
  for (const [idx, list] of Object.entries(SITES)) {
    const buyerId = buyerIds[Number(idx)]
    if (!buyerId) continue
    await sb.from("buyer_sites").insert(list.map((s) => ({ buyer_id: buyerId, is_demo: true, ...s })))
    n += list.length
  }
  console.log(`Seeded ${n} buyer sites.`)
}

async function main() {
  loadEnv()
  const sb = admin()
  console.log("\nGridLink invoicing seed\n")

  await clear(sb)
  const { buyerIds, loginVendor, otherVendors } = await resolveParties(sb)
  await seedSites(sb, buyerIds)
  console.log(`Demo supplier: ${loginVendor.name}`)

  const counters = new Map<string, number>()
  let invoiceCount = 0
  let paymentCount = 0

  for (const c of CONTRACTS) {
    const vendor = c.vendor === "login" ? loginVendor : otherVendors[c.vendor % otherVendors.length]
    const buyerId = buyerIds[c.buyerIndex]
    const awardedAt = daysAgo(c.awardedDaysAgo)

    // Historical awarded RFP + winning response so the contract has provenance.
    await sb.from("rfps").upsert({
      id: rfpId(c.key),
      is_demo: true,
      buyer_id: buyerId,
      title: c.title,
      description: `Awarded supply contract — ${c.fuelType} for ${BUYERS[c.buyerIndex].companyName}.`,
      fuel_type: c.fuelType,
      quantity_gallons: c.gallons,
      delivery_states: c.states,
      delivery_addresses: ["Per contract site list"],
      delivery_dates: [iso(addDays(awardedAt, 14))],
      recurrence: "recurring",
      urgency: "standard",
      status: "awarded",
      awarded_vendor_id: vendor.id,
      bid_due_date: addDays(awardedAt, -10).toISOString(),
      decision_date: addDays(awardedAt, -3).toISOString(),
      expected_award_date: awardedAt.toISOString(),
      published_at: addDays(awardedAt, -30).toISOString(),
      created_at: addDays(awardedAt, -32).toISOString(),
    })
    await sb.from("rfp_invitations").insert({ rfp_id: rfpId(c.key), vendor_id: vendor.id, invited_at: addDays(awardedAt, -30).toISOString(), viewed_at: addDays(awardedAt, -28).toISOString(), responded_at: addDays(awardedAt, -20).toISOString() })
    await sb.from("rfp_responses").insert({ rfp_id: rfpId(c.key), vendor_id: vendor.id, price_per_gallon: c.ppg, total_price: r2(c.ppg * c.gallons), delivery_terms: `Delivered, net ${c.netDays}`, validity_days: 30, status: "submitted", submitted_at: addDays(awardedAt, -20).toISOString() })

    await sb.from("contracts").upsert({
      id: contractId(c.key),
      rfp_id: rfpId(c.key),
      buyer_id: buyerId,
      vendor_id: vendor.id,
      title: c.title,
      fuel_type: c.fuelType,
      quantity_gallons: c.gallons,
      price_per_gallon: c.ppg,
      delivery_terms: `Delivered, net ${c.netDays}`,
      net_days: c.netDays,
      status: "active",
      awarded_at: awardedAt.toISOString(),
      is_demo: true,
    })

    // Invoices every cadenceDays from ~14 days after award up to today.
    let cursor = addDays(awardedAt, 14)
    let n = 0
    while (cursor.getTime() <= Date.now()) {
      n += 1
      const seq = (counters.get(vendor.id) ?? 0) + 1
      counters.set(vendor.id, seq)
      const number = `${prefix(vendor.name)}-${String(seq).padStart(4, "0")}`
      const issue = cursor
      const due = addDays(issue, c.netDays)
      const ageDays = Math.round((Date.now() - issue.getTime()) / 86400000)

      // Vary gallons and price a little for realism.
      const gal = Math.round(c.perInvoiceGallons * (0.85 + ((n * 7) % 30) / 100))
      const ppg = r2(c.ppg + (((n * 13) % 7) - 3) * 0.01)
      const lines: { kind: string; description: string; delivery_date: string | null; ticket_number: string | null; gallons: number | null; price_per_gallon: number | null; amount: number }[] = []
      // split into 2 drops
      const g1 = Math.round(gal * 0.6)
      const g2 = gal - g1
      lines.push({ kind: "fuel", description: `${c.fuelType} — ${c.states[0]} site`, delivery_date: iso(addDays(issue, -3)), ticket_number: `T-${80000 + c.key * 1000 + n * 10 + 1}`, gallons: g1, price_per_gallon: ppg, amount: r2(g1 * ppg) })
      lines.push({ kind: "fuel", description: `${c.fuelType} — ${c.states[c.states.length - 1]} site`, delivery_date: iso(addDays(issue, -1)), ticket_number: `T-${80000 + c.key * 1000 + n * 10 + 2}`, gallons: g2, price_per_gallon: ppg, amount: r2(g2 * ppg) })
      if (c.fee) lines.push({ kind: "fee", description: "Delivery fee", delivery_date: null, ticket_number: null, gallons: null, price_per_gallon: null, amount: c.fee })
      if (c.taxPerGal) lines.push({ kind: "tax", description: "State fuel tax", delivery_date: null, ticket_number: null, gallons: null, price_per_gallon: null, amount: r2(gal * c.taxPerGal) })
      const subtotal = r2(lines.filter((l) => l.kind === "fuel").reduce((s, l) => s + l.amount, 0))
      const fees = r2(lines.filter((l) => l.kind === "fee").reduce((s, l) => s + l.amount, 0))
      const tax = r2(lines.filter((l) => l.kind === "tax").reduce((s, l) => s + l.amount, 0))
      const total = r2(subtotal + fees + tax)

      // Status by age: old → paid; recent → open/viewed; sprinkle disputes, partials, one draft.
      const dueAge = Math.round((Date.now() - due.getTime()) / 86400000)
      let status = "sent"
      let amountPaid = 0
      let paidAt: Date | null = null
      const payments: { amount: number; method: string; reference: string; paid_at: string; role: "buyer" | "vendor" }[] = []
      const isLatest = addDays(cursor, c.cadenceDays).getTime() > Date.now()

      if (c.vendor === "login" && c.key === 0 && isLatest) {
        status = "draft"
      } else if (ageDays > c.netDays + 20 && !(c.key === 1 && n === 3)) {
        // paid; sometimes late, sometimes early
        status = "paid"
        const lateBy = ((n * 11 + c.key * 5) % 25) - 8 // -8 .. +16 days vs due
        paidAt = addDays(due, lateBy)
        if (paidAt.getTime() > Date.now()) paidAt = daysAgo(1)
        amountPaid = total
        const split = n % 4 === 0
        if (split) {
          payments.push({ amount: r2(total * 0.5), method: "ach", reference: `ACH-${40000 + seq * 7}`, paid_at: iso(addDays(paidAt, -12)), role: "buyer" })
          payments.push({ amount: r2(total - r2(total * 0.5)), method: "ach", reference: `ACH-${40000 + seq * 7 + 1}`, paid_at: iso(paidAt), role: "buyer" })
        } else {
          payments.push({ amount: total, method: n % 3 === 0 ? "check" : "ach", reference: n % 3 === 0 ? `CHK ${10200 + seq}` : `ACH-${40000 + seq * 7}`, paid_at: iso(paidAt), role: n % 5 === 0 ? "vendor" : "buyer" })
        }
      } else if (c.key === 1 && n === 3) {
        status = "disputed"
      } else if (dueAge > 0 && n % 2 === 0) {
        status = "partially_paid"
        amountPaid = r2(total * 0.4)
        payments.push({ amount: amountPaid, method: "ach", reference: `ACH-${40000 + seq * 7}`, paid_at: iso(addDays(due, -2)), role: "buyer" })
      } else if (dueAge > 0) {
        status = "viewed" // overdue
      } else {
        status = n % 2 === 0 ? "viewed" : "sent"
      }

      const sentAt = status === "draft" ? null : addDays(issue, 0).toISOString()
      const viewedAt = ["viewed", "disputed", "partially_paid", "paid"].includes(status) ? addDays(issue, 1).toISOString() : null

      const { data: inv, error } = await sb
        .from("invoices")
        .insert({
          contract_id: contractId(c.key),
          buyer_id: buyerId,
          vendor_id: vendor.id,
          seq,
          number,
          status,
          issue_date: iso(issue),
          due_date: iso(due),
          subtotal,
          fees_total: fees,
          tax_total: tax,
          total,
          amount_paid: amountPaid,
          notes: n === 1 ? `First invoice under contract ${c.title}. Remit via ACH; reference invoice number.` : null,
          sent_at: sentAt,
          viewed_at: viewedAt,
          disputed_at: status === "disputed" ? addDays(issue, 4).toISOString() : null,
          dispute_reason: status === "disputed" ? "Ticket T-81032 shows 54,100 gal delivered; invoice bills 57,000. Please correct." : null,
          paid_at: paidAt?.toISOString() ?? null,
          is_demo: true,
          created_at: issue.toISOString(),
        })
        .select("id")
        .single()
      if (error || !inv) throw new Error(`invoice insert failed: ${error?.message}`)
      invoiceCount += 1

      await sb.from("invoice_line_items").insert(lines.map((l, i) => ({ invoice_id: inv.id, position: i, ...l })))

      const events: { type: string; actor_role: string; message?: string | null; amount?: number | null; created_at: string }[] = [
        { type: "created", actor_role: "vendor", created_at: addDays(issue, 0).toISOString() },
      ]
      if (sentAt) events.push({ type: "sent", actor_role: "vendor", created_at: addDays(issue, 0).toISOString() })
      if (viewedAt) events.push({ type: "viewed", actor_role: "link", message: "Opened from email link", created_at: viewedAt })
      if (status === "disputed") events.push({ type: "disputed", actor_role: "buyer", message: "Ticket T-81032 shows 54,100 gal delivered; invoice bills 57,000. Please correct.", created_at: addDays(issue, 4).toISOString() })
      for (const p of payments) {
        await sb.from("payments").insert({ invoice_id: inv.id, amount: p.amount, method: p.method, reference: p.reference, paid_at: p.paid_at, recorded_by: p.role === "buyer" ? buyerId : null, recorded_role: p.role, created_at: p.paid_at + "T15:00:00Z" })
        paymentCount += 1
        events.push({ type: "payment_recorded", actor_role: p.role, message: p.reference, amount: p.amount, created_at: p.paid_at + "T15:00:00Z" })
      }
      if (status === "paid" && paidAt) events.push({ type: "paid", actor_role: "system", created_at: paidAt.toISOString() })
      await sb.from("invoice_events").insert(events.map((e) => ({ invoice_id: inv.id, ...e })))

      cursor = addDays(cursor, c.cadenceDays)
    }
  }

  for (const [vendorId, last] of counters) {
    await sb.from("invoice_counters").upsert({ vendor_id: vendorId, last_seq: last })
  }

  // ---- Orders, deliveries, messages, ratings -----------------------------
  console.log("Seeding orders, deliveries, messages, ratings…")
  let orderCount = 0, deliveryCount = 0
  const sitesFor = (buyerIndex: number) => (SITES[buyerIndex] ?? []).map((x) => x.address)
  for (const c of CONTRACTS) {
    const vendor = c.vendor === "login" ? loginVendor : otherVendors[c.vendor % otherVendors.length]
    const buyerId = buyerIds[c.buyerIndex]
    const sites = sitesFor(c.buyerIndex).length ? sitesFor(c.buyerIndex) : [`${c.states[0]} site`]
    const cid = contractId(c.key)
    // 3 delivered orders in the past (with deliveries; two billed via invoices are separate, keep these unbilled=false by linking none)
    for (let n = 0; n < 3; n++) {
      const ws = daysAgo(40 - n * 12)
      const we = addDays(ws, 3)
      const site = sites[n % sites.length]
      const gal = Math.round(c.perInvoiceGallons * 0.45)
      const late = c.key === 1 && n === 1
      const { data: o } = await sb.from("orders").insert({ contract_id: cid, buyer_id: buyerId, vendor_id: vendor.id, site_address: site, gallons: gal, window_start: iso(ws), window_end: iso(we), urgency: "standard", status: "delivered", scheduled_for: iso(addDays(ws, 1)), confirmed_at: addDays(ws, -1).toISOString(), is_demo: true, created_at: addDays(ws, -3).toISOString() }).select("id").single()
      orderCount += 1
      await sb.from("deliveries").insert({ order_id: o?.id ?? null, contract_id: cid, buyer_id: buyerId, vendor_id: vendor.id, delivered_at: iso(addDays(ws, late ? 5 : 1)), site_address: site, gallons: gal - (n * 37), ticket_number: `T-${90000 + c.key * 100 + n}`, notes: null, on_time: !late, is_demo: true, created_at: addDays(ws, 1).toISOString() })
      deliveryCount += 1
    }
    // open orders for active demo: one requested, one scheduled; emergency on the login vendor's first contract
    const w1 = daysAgo(-2)
    await sb.from("orders").insert({ contract_id: cid, buyer_id: buyerId, vendor_id: vendor.id, site_address: sites[0], gallons: Math.round(c.perInvoiceGallons * 0.5), window_start: iso(w1), window_end: iso(addDays(w1, 3)), urgency: c.key === 0 ? "emergency" : "standard", notes: c.key === 0 ? "Generator tank at 12% — storm forecast Thursday." : null, status: "requested", is_demo: true, created_at: daysAgo(0).toISOString() })
    await sb.from("orders").insert({ contract_id: cid, buyer_id: buyerId, vendor_id: vendor.id, site_address: sites[1 % sites.length], gallons: Math.round(c.perInvoiceGallons * 0.4), window_start: iso(daysAgo(1)), window_end: iso(daysAgo(-4)), urgency: "standard", status: "scheduled", scheduled_for: iso(daysAgo(-1)), confirmed_at: daysAgo(1).toISOString(), is_demo: true, created_at: daysAgo(2).toISOString() })
    orderCount += 2
    // an unbilled delivery so the invoice maker has something to pull in
    await sb.from("deliveries").insert({ order_id: null, contract_id: cid, buyer_id: buyerId, vendor_id: vendor.id, delivered_at: iso(daysAgo(3)), site_address: sites[0], gallons: Math.round(c.perInvoiceGallons * 0.55), ticket_number: `T-${91000 + c.key}`, on_time: true, is_demo: true, created_at: daysAgo(3).toISOString() })
    deliveryCount += 1
    // contract thread
    await sb.from("messages").insert([
      { thread_type: "contract", thread_id: cid, buyer_id: buyerId, vendor_id: vendor.id, sender_role: "buyer", body: `Can we move next week's ${sites[0].split(",")[0]} drop to Thursday morning? Gate opens at 6.`, is_broadcast: false, read_by_buyer: true, read_by_vendor: c.vendor !== "login", is_demo: true, created_at: daysAgo(2).toISOString() },
      { thread_type: "contract", thread_id: cid, buyer_id: buyerId, vendor_id: vendor.id, sender_role: "vendor", body: "Thursday works. Tankwagon 14 will be there 6:30–8:00. Ticket will be emailed same day.", is_broadcast: false, read_by_buyer: c.buyerIndex !== 0, read_by_vendor: true, is_demo: true, created_at: daysAgo(1).toISOString() },
    ])
    // rating on older contracts
    if (c.awardedDaysAgo >= 120) {
      const stars = c.key === 1 ? 4 : 5
      await sb.from("supplier_ratings").insert({ contract_id: cid, buyer_id: buyerId, vendor_id: vendor.id, stars, comment: stars === 5 ? "Reliable drops, tickets always same day." : "Good pricing; one late delivery in the spring.", is_demo: true, created_at: daysAgo(20).toISOString() })
    }
  }
  // RFP Q&A on a published demo RFP for the login vendor
  // Q&A goes on the demo buyer's (Mercy) most recent published RFP so both demo logins see it.
  const { data: pubRfp } = await sb.from("rfps").select("id, buyer_id").eq("is_demo", true).eq("status", "published").eq("buyer_id", buyerIds[0]).order("created_at", { ascending: false }).limit(1).maybeSingle()
  if (pubRfp) {
    await sb.from("rfp_invitations").upsert({ rfp_id: pubRfp.id, vendor_id: loginVendor.id }, { onConflict: "rfp_id,vendor_id", ignoreDuplicates: true }).then(() => {}, () => {})
    await sb.from("messages").insert([
      { thread_type: "rfp", thread_id: pubRfp.id, buyer_id: pubRfp.buyer_id, vendor_id: loginVendor.id, sender_role: "vendor", body: "Is wet-hose refueling required at every site, or only the main depot?", is_broadcast: false, read_by_buyer: false, read_by_vendor: true, is_demo: true, created_at: daysAgo(1).toISOString() },
      { thread_type: "rfp", thread_id: pubRfp.id, buyer_id: pubRfp.buyer_id, vendor_id: null, sender_role: "buyer", body: "Clarification for all bidders: delivery tickets must be provided within 24 hours of each drop.", is_broadcast: true, read_by_buyer: true, read_by_vendor: false, is_demo: true, created_at: daysAgo(0).toISOString() },
    ])
  }
  console.log(`Seeded ${orderCount} orders, ${deliveryCount} deliveries, messages and ratings.`)

  // ---- Compliance documents (placeholder PDFs in storage) ----------------
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF")
  const docPlan: { vendorId: string; type: string; name: string; expires: string | null }[] = [
    { vendorId: loginVendor.id, type: "w9", name: "W9-Apex-Fuel-2026.pdf", expires: null },
    { vendorId: loginVendor.id, type: "coi", name: "COI-Apex-Fuel-2026.pdf", expires: iso(daysAgo(-200)) },
    { vendorId: loginVendor.id, type: "distributor_license", name: "IL-Distributor-License.pdf", expires: iso(daysAgo(-320)) },
    { vendorId: otherVendors[0].id, type: "w9", name: "W9.pdf", expires: null },
    { vendorId: otherVendors[0].id, type: "coi", name: "COI-2025.pdf", expires: iso(daysAgo(22)) },       // expired
    { vendorId: otherVendors[1].id, type: "w9", name: "W9.pdf", expires: null },
    { vendorId: otherVendors[1].id, type: "coi", name: "COI-2026.pdf", expires: iso(daysAgo(-19)) },      // expiring
    { vendorId: otherVendors[2].id, type: "coi", name: "COI-2026.pdf", expires: iso(daysAgo(-150)) },     // W-9 missing
  ]
  const seededVendorIds = [...new Set(docPlan.map((d) => d.vendorId))]
  const { data: oldDocs } = await sb.from("vendor_documents").select("id, file_url").in("vendor_id", seededVendorIds)
  if (oldDocs?.length) {
    await sb.storage.from("vendor-documents").remove(oldDocs.map((d) => d.file_url as string)).then(() => {}, () => {})
    await sb.from("vendor_documents").delete().in("id", oldDocs.map((d) => d.id as string))
  }
  for (const d of docPlan) {
    const path = `vendors/${d.vendorId}/${d.type}/seed-${d.name}`
    await sb.storage.from("vendor-documents").upload(path, pdf, { contentType: "application/pdf", upsert: true })
    await sb.from("vendor_documents").insert({ vendor_id: d.vendorId, document_type: d.type, file_url: path, file_name: d.name, expires_at: d.expires, uploaded_at: daysAgo(30).toISOString() })
  }
  console.log(`Seeded ${docPlan.length} compliance documents.`)

  console.log(`\nSeeded ${CONTRACTS.length} contracts, ${invoiceCount} invoices, ${paymentCount} payments.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
