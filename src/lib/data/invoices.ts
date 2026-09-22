import "server-only"

import { format } from "date-fns"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { sendEmail, siteUrl } from "@/lib/email"
import { renderInvoicePdf } from "@/lib/invoicing/pdf"
import { computeTotals } from "@/lib/schemas/invoice"
import { markDeliveriesBilled, unbillDeliveriesForInvoice } from "@/lib/data/orders"
import type {
  AdminInvoiceStats,
  AgingBucket,
  BuyerInvoiceStats,
  ContractSummary,
  InvoiceDetail,
  InvoiceEventView,
  InvoiceInput,
  InvoiceLineItem,
  InvoiceListItem,
  InvoiceStatus,
  MonthPoint,
  NamedAmount,
  PartyRole,
  PaymentInput,
  PaymentView,
  VendorInvoiceStats,
  Viewer,
} from "@/lib/invoicing/types"
import { isOpenStatus, money } from "@/lib/invoicing/types"

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string }

const r2 = (n: number) => Math.round(n * 100) / 100
const todayISO = () => new Date().toISOString().slice(0, 10)

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function overdueInfo(dueDate: string, status: InvoiceStatus) {
  const today = todayISO()
  const open = isOpenStatus(status)
  const days = open && dueDate < today ? daysBetween(dueDate, today) : 0
  return { isOverdue: days > 0, daysOverdue: days }
}

function invoicePrefix(companyName: string) {
  const words = companyName.replace(/[^A-Za-z ]/g, "").trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length >= 2 ? words.slice(0, 3).map((w) => w[0]).join("") : (words[0] ?? "INV").slice(0, 3)
  return (letters || "INV").toUpperCase()
}

function netDaysFrom(terms: string | null | undefined) {
  const m = terms?.match(/net\s*(\d{1,3})/i)
  return m ? Number(m[1]) : 30
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function monthKey(iso: string) {
  return iso.slice(0, 7)
}

function lastMonths(n: number): { month: string; label: string }[] {
  const out: { month: string; label: string }[] = []
  const d = new Date()
  d.setUTCDate(1)
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1))
    out.push({ month: m.toISOString().slice(0, 7), label: format(m, "MMM") })
  }
  return out
}

function isParty(inv: { buyerId: string; vendorId: string }, viewer: Viewer) {
  if (viewer.role === "admin") return true
  if (viewer.role === "buyer") return inv.buyerId === viewer.id
  return inv.vendorId === viewer.id
}

// ---------------------------------------------------------------------------
// Preview-mode mock store
// ---------------------------------------------------------------------------
const PREVIEW_BUYER_ID = "preview-buyer"
const PREVIEW_VENDOR_ID = "vendor-apex"

interface MockStore {
  contracts: ContractSummary[]
  invoices: InvoiceDetail[]
}

function mockInvoice(
  partial: Partial<InvoiceDetail> & Pick<InvoiceDetail, "id" | "number" | "status" | "issueDate" | "dueDate" | "lineItems">
): InvoiceDetail {
  const totals = computeTotals(partial.lineItems)
  const amountPaid = partial.amountPaid ?? 0
  const base: InvoiceDetail = {
    id: partial.id,
    number: partial.number,
    status: partial.status,
    issueDate: partial.issueDate,
    dueDate: partial.dueDate,
    total: totals.total,
    amountPaid,
    balance: r2(totals.total - amountPaid),
    ...overdueInfo(partial.dueDate, partial.status),
    buyerName: "Metro Transit Authority",
    vendorName: "Apex Fuel Co.",
    contractId: "contract-schooldist",
    contractTitle: "Heating Oil & Diesel — Annual Contract",
    sentAt: partial.status === "draft" ? null : partial.issueDate + "T15:00:00Z",
    subtotal: totals.subtotal,
    feesTotal: totals.fees,
    taxTotal: totals.tax,
    notes: null,
    lineItems: partial.lineItems,
    payments: [],
    events: [{ id: `${partial.id}-e1`, type: "created", actorRole: "vendor", message: null, amount: null, createdAt: partial.issueDate + "T14:00:00Z" }],
    viewToken: `preview-${partial.id}`,
    viewedAt: null,
    disputedAt: null,
    disputeReason: null,
    paidAt: null,
    pdfPath: null,
    contract: { fuelType: "Diesel", pricePerGallon: 3.55, quantityGallons: 920_000, deliveryTerms: "Delivered campus, net 30", netDays: 30 },
    vendorAddress: "1420 Industrial Pkwy, Chicago, IL 60616",
    buyerId: PREVIEW_BUYER_ID,
    vendorId: PREVIEW_VENDOR_ID,
  }
  const inv = { ...base, ...partial, total: totals.total, subtotal: totals.subtotal, feesTotal: totals.fees, taxTotal: totals.tax }
  inv.balance = r2(inv.total - inv.amountPaid)
  Object.assign(inv, overdueInfo(inv.dueDate, inv.status))
  return inv
}

function seedMock(): MockStore {
  const fuel = (desc: string, date: string, ticket: string, gal: number, ppg = 3.55): InvoiceLineItem => ({
    kind: "fuel", description: desc, deliveryDate: date, ticketNumber: ticket, gallons: gal, pricePerGallon: ppg, amount: r2(gal * ppg),
  })
  const fee = (desc: string, amount: number, kind: "fee" | "tax" = "fee"): InvoiceLineItem => ({
    kind, description: desc, deliveryDate: null, ticketNumber: null, gallons: null, pricePerGallon: null, amount,
  })
  const d = (daysAgo: number) => addDays(todayISO(), -daysAgo)

  const invoices: InvoiceDetail[] = [
    mockInvoice({ id: "inv-1", number: "AFC-0001", status: "paid", issueDate: d(95), dueDate: d(65), amountPaid: 0,
      lineItems: [fuel("Diesel — Campus Dr depot", d(97), "T-88120", 42_000), fee("Delivery fee", 350), fee("State fuel tax", 1_260, "tax")],
      payments: [{ id: "p1", amount: 150_710, method: "ach", reference: "ACH-44812", paidAt: d(70), recordedRole: "buyer", note: null }], paidAt: d(70) + "T10:00:00Z", viewedAt: d(93) + "T09:00:00Z" }),
    mockInvoice({ id: "inv-2", number: "AFC-0002", status: "paid", issueDate: d(64), dueDate: d(34), amountPaid: 0,
      lineItems: [fuel("Diesel — Campus Dr depot", d(66), "T-88410", 45_000), fee("Delivery fee", 350)],
      payments: [{ id: "p2", amount: 160_100, method: "check", reference: "CHK 10233", paidAt: d(30), recordedRole: "vendor", note: null }], paidAt: d(30) + "T10:00:00Z", viewedAt: d(62) + "T09:00:00Z" }),
    mockInvoice({ id: "inv-3", number: "AFC-0003", status: "partially_paid", issueDate: d(40), dueDate: d(10),
      lineItems: [fuel("Diesel — Campus Dr depot", d(42), "T-88790", 40_000), fuel("Diesel — West garage", d(41), "T-88791", 8_000), fee("State fuel tax", 1_440, "tax")],
      amountPaid: 100_000, payments: [{ id: "p3", amount: 100_000, method: "ach", reference: "ACH-45102", paidAt: d(12), recordedRole: "buyer", note: "Partial — remainder next cycle" }], viewedAt: d(38) + "T09:00:00Z" }),
    mockInvoice({ id: "inv-4", number: "AFC-0004", status: "viewed", issueDate: d(20), dueDate: addDays(todayISO(), 10),
      lineItems: [fuel("Diesel — Campus Dr depot", d(22), "T-89004", 44_000), fee("Delivery fee", 350)], viewedAt: d(18) + "T09:00:00Z" }),
    mockInvoice({ id: "inv-5", number: "AFC-0005", status: "disputed", issueDate: d(15), dueDate: addDays(todayISO(), 15),
      lineItems: [fuel("Diesel — West garage", d(16), "T-89110", 12_000), fee("Emergency dispatch surcharge", 900)],
      disputedAt: d(13) + "T11:00:00Z", disputeReason: "Surcharge was not on the PO — please remove or provide authorization.", viewedAt: d(14) + "T09:00:00Z" }),
    mockInvoice({ id: "inv-6", number: "AFC-0006", status: "draft", issueDate: todayISO(), dueDate: addDays(todayISO(), 30),
      lineItems: [fuel("Diesel — Campus Dr depot", d(1), "T-89330", 43_500)] }),
  ]
  // fix amountPaid on paid mock rows to match totals
  for (const inv of invoices) {
    if (inv.status === "paid") { inv.amountPaid = inv.total; inv.balance = 0 }
  }
  const invoiced = invoices.filter((i) => i.status !== "draft" && i.status !== "void")
  const contracts: ContractSummary[] = [
    {
      id: "contract-schooldist", rfpId: "rfp-schooldist", title: "Heating Oil & Diesel — Annual Contract", fuelType: "Diesel",
      quantityGallons: 920_000, pricePerGallon: 3.55, deliveryTerms: "Delivered campus, net 30", netDays: 30, pricingMode: "fixed", indexName: null, differential: null, status: "active",
      awardedAt: d(100) + "T16:00:00Z", buyerId: PREVIEW_BUYER_ID, buyerName: "Metro Transit Authority", vendorId: PREVIEW_VENDOR_ID, vendorName: "Apex Fuel Co.",
      invoiceCount: invoiced.length, invoicedTotal: r2(invoiced.reduce((s, i) => s + i.total, 0)), paidTotal: r2(invoiced.reduce((s, i) => s + i.amountPaid, 0)),
    },
  ]
  return { contracts, invoices }
}

function mock(): MockStore {
  const g = globalThis as unknown as { __gridlinkInvoiceMock?: MockStore }
  if (!g.__gridlinkInvoiceMock) g.__gridlinkInvoiceMock = seedMock()
  return g.__gridlinkInvoiceMock
}

function mockEvent(inv: InvoiceDetail, type: InvoiceEventView["type"], actorRole: string, message: string | null = null, amount: number | null = null) {
  inv.events.unshift({ id: `${inv.id}-${Date.now()}-${type}`, type, actorRole, message, amount, createdAt: new Date().toISOString() })
}

function refreshMockContract(store: MockStore, contractId: string) {
  const c = store.contracts.find((x) => x.id === contractId)
  if (!c) return
  const invs = store.invoices.filter((i) => i.contractId === contractId && i.status !== "draft" && i.status !== "void")
  c.invoiceCount = invs.length
  c.invoicedTotal = r2(invs.reduce((s, i) => s + i.total, 0))
  c.paidTotal = r2(invs.reduce((s, i) => s + i.amountPaid, 0))
}

// ---------------------------------------------------------------------------
// Name lookups (service role — vendors can't read buyer profiles under RLS)
// ---------------------------------------------------------------------------
async function buyerNames(ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))]
  if (!uniq.length) return new Map<string, string>()
  const { data } = await createAdminClient().from("profiles").select("id, company_name, full_name").in("id", uniq)
  return new Map((data ?? []).map((p) => [p.id as string, ((p.company_name as string) || (p.full_name as string) || "Buyer")]))
}

async function vendorInfo(ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))]
  if (!uniq.length) return new Map<string, { name: string; address: string | null; profileId: string | null }>()
  const { data } = await createAdminClient().from("vendors").select("id, company_name, corporate_address, profile_id").in("id", uniq)
  return new Map(
    (data ?? []).map((v) => [v.id as string, { name: (v.company_name as string) ?? "Supplier", address: (v.corporate_address as string) ?? null, profileId: (v.profile_id as string) ?? null }])
  )
}

async function emailForProfile(profileId: string | null): Promise<string | null> {
  if (!profileId) return null
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(profileId)
    return data.user?.email ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------
export async function createContractForAward(params: {
  rfpId: string
  buyerId: string
  vendorId: string
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null

  const admin = createAdminClient()
  const [{ data: rfp }, { data: resp }] = await Promise.all([
    admin.from("rfps").select("id, title, fuel_type, quantity_gallons, is_demo").eq("id", params.rfpId).maybeSingle(),
    admin.from("rfp_responses").select("price_per_gallon, delivery_terms, pricing_mode, index_name, differential").eq("rfp_id", params.rfpId).eq("vendor_id", params.vendorId).maybeSingle(),
  ])
  if (!rfp) return null

  const { data, error } = await admin
    .from("contracts")
    .upsert(
      {
        rfp_id: rfp.id,
        buyer_id: params.buyerId,
        vendor_id: params.vendorId,
        title: rfp.title,
        fuel_type: rfp.fuel_type ?? null,
        quantity_gallons: rfp.quantity_gallons ?? null,
        price_per_gallon: resp?.price_per_gallon ?? null,
        delivery_terms: resp?.delivery_terms ?? null,
        net_days: netDaysFrom(resp?.delivery_terms as string | null),
        pricing_mode: (resp?.pricing_mode as string) ?? "fixed",
        index_name: (resp?.index_name as string) ?? null,
        differential: resp?.differential ?? null,
        is_demo: Boolean(rfp.is_demo),
      },
      { onConflict: "rfp_id" }
    )
    .select("id")
    .single()
  if (error) {
    console.error("createContractForAward:", error.message)
    return null
  }
  return data.id as string
}

function contractQuery(viewer: Viewer) {
  let q = createAdminClient().from("contracts").select("*").order("awarded_at", { ascending: false })
  if (viewer.role === "buyer") q = q.eq("buyer_id", viewer.id)
  if (viewer.role === "vendor") q = q.eq("vendor_id", viewer.id)
  return q
}

export async function listContracts(viewer: Viewer): Promise<ContractSummary[]> {
  if (!isSupabaseConfigured()) {
    return mock().contracts.filter((c) => isParty(c, viewer))
  }

  const { data } = await contractQuery(viewer)
  const rows = data ?? []
  if (!rows.length) return []

  const ids = rows.map((r) => r.id as string)
  const [buyers, vendors, { data: invRows }] = await Promise.all([
    buyerNames(rows.map((r) => r.buyer_id as string)),
    vendorInfo(rows.map((r) => r.vendor_id as string)),
    createAdminClient().from("invoices").select("contract_id, total, amount_paid, status").in("contract_id", ids),
  ])
  const agg = new Map<string, { count: number; invoiced: number; paid: number }>()
  for (const i of invRows ?? []) {
    if (i.status === "draft" || i.status === "void") continue
    const a = agg.get(i.contract_id as string) ?? { count: 0, invoiced: 0, paid: 0 }
    a.count += 1
    a.invoiced += Number(i.total) || 0
    a.paid += Number(i.amount_paid) || 0
    agg.set(i.contract_id as string, a)
  }

  return rows.map((r) => {
    const a = agg.get(r.id as string) ?? { count: 0, invoiced: 0, paid: 0 }
    return {
      id: r.id as string,
      rfpId: r.rfp_id as string,
      title: r.title as string,
      fuelType: (r.fuel_type as string) ?? "",
      quantityGallons: Number(r.quantity_gallons) || 0,
      pricePerGallon: Number(r.price_per_gallon) || 0,
      deliveryTerms: (r.delivery_terms as string) ?? null,
      netDays: Number(r.net_days) || 30,
      pricingMode: ((r.pricing_mode as string) ?? "fixed") as ContractSummary["pricingMode"],
      indexName: (r.index_name as string) ?? null,
      differential: r.differential == null ? null : Number(r.differential),
      status: r.status as ContractSummary["status"],
      awardedAt: r.awarded_at as string,
      buyerId: r.buyer_id as string,
      buyerName: buyers.get(r.buyer_id as string) ?? "Buyer",
      vendorId: r.vendor_id as string,
      vendorName: vendors.get(r.vendor_id as string)?.name ?? "Supplier",
      invoiceCount: a.count,
      invoicedTotal: r2(a.invoiced),
      paidTotal: r2(a.paid),
    }
  })
}

export async function getContract(id: string, viewer: Viewer): Promise<ContractSummary | null> {
  const all = await listContracts(viewer)
  return all.find((c) => c.id === id) ?? null
}

// ---------------------------------------------------------------------------
// Invoices — reads
// ---------------------------------------------------------------------------
type InvoiceRow = Record<string, unknown>

function rowToListItem(
  r: InvoiceRow,
  names: { buyer: string; vendor: string; contractTitle: string }
): InvoiceListItem {
  const total = Number(r.total) || 0
  const paid = Number(r.amount_paid) || 0
  const status = r.status as InvoiceStatus
  const dueDate = r.due_date as string
  return {
    id: r.id as string,
    number: r.number as string,
    status,
    issueDate: r.issue_date as string,
    dueDate,
    total,
    amountPaid: paid,
    balance: r2(total - paid),
    ...overdueInfo(dueDate, status),
    buyerName: names.buyer,
    vendorName: names.vendor,
    contractId: r.contract_id as string,
    contractTitle: names.contractTitle,
    sentAt: (r.sent_at as string) ?? null,
  }
}

async function hydrateNames(rows: InvoiceRow[]) {
  const admin = createAdminClient()
  const contractIds = [...new Set(rows.map((r) => r.contract_id as string))]
  const [buyers, vendors, { data: contracts }] = await Promise.all([
    buyerNames(rows.map((r) => r.buyer_id as string)),
    vendorInfo(rows.map((r) => r.vendor_id as string)),
    contractIds.length
      ? admin.from("contracts").select("id, title, fuel_type, price_per_gallon, quantity_gallons, delivery_terms, net_days").in("id", contractIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ])
  const contractMap = new Map((contracts ?? []).map((c) => [c.id as string, c]))
  return { buyers, vendors, contractMap }
}

export async function listInvoices(viewer: Viewer): Promise<InvoiceListItem[]> {
  if (!isSupabaseConfigured()) {
    return mock().invoices.filter((i) => isParty(i, viewer)).map((i) => ({ ...i, ...overdueInfo(i.dueDate, i.status) }))
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  }

  let q = createAdminClient().from("invoices").select("*").order("issue_date", { ascending: false }).order("seq", { ascending: false })
  if (viewer.role === "buyer") q = q.eq("buyer_id", viewer.id)
  if (viewer.role === "vendor") q = q.eq("vendor_id", viewer.id)
  const { data } = await q
  const rows = (data ?? []) as InvoiceRow[]
  if (!rows.length) return []
  const { buyers, vendors, contractMap } = await hydrateNames(rows)
  return rows.map((r) =>
    rowToListItem(r, {
      buyer: buyers.get(r.buyer_id as string) ?? "Buyer",
      vendor: vendors.get(r.vendor_id as string)?.name ?? "Supplier",
      contractTitle: (contractMap.get(r.contract_id as string)?.title as string) ?? "Contract",
    })
  )
}

async function loadDetail(row: InvoiceRow): Promise<InvoiceDetail> {
  const admin = createAdminClient()
  const id = row.id as string
  const [{ buyers, vendors, contractMap }, { data: lines }, { data: pays }, { data: events }] = await Promise.all([
    hydrateNames([row]),
    admin.from("invoice_line_items").select("*").eq("invoice_id", id).order("position"),
    admin.from("payments").select("*").eq("invoice_id", id).order("paid_at", { ascending: false }),
    admin.from("invoice_events").select("*").eq("invoice_id", id).order("created_at", { ascending: false }),
  ])
  const c = contractMap.get(row.contract_id as string)
  const v = vendors.get(row.vendor_id as string)
  const base = rowToListItem(row, {
    buyer: buyers.get(row.buyer_id as string) ?? "Buyer",
    vendor: v?.name ?? "Supplier",
    contractTitle: (c?.title as string) ?? "Contract",
  })
  return {
    ...base,
    subtotal: Number(row.subtotal) || 0,
    feesTotal: Number(row.fees_total) || 0,
    taxTotal: Number(row.tax_total) || 0,
    notes: (row.notes as string) ?? null,
    lineItems: (lines ?? []).map((l) => ({
      id: l.id as string,
      kind: l.kind as InvoiceLineItem["kind"],
      description: l.description as string,
      deliveryDate: (l.delivery_date as string) ?? null,
      ticketNumber: (l.ticket_number as string) ?? null,
      gallons: l.gallons == null ? null : Number(l.gallons),
      pricePerGallon: l.price_per_gallon == null ? null : Number(l.price_per_gallon),
      indexPrice: l.index_price == null ? null : Number(l.index_price),
      deliveryId: (l.delivery_id as string) ?? null,
      amount: Number(l.amount) || 0,
    })),
    payments: (pays ?? []).map((p) => ({
      id: p.id as string,
      amount: Number(p.amount) || 0,
      method: p.method as PaymentView["method"],
      reference: (p.reference as string) ?? null,
      paidAt: p.paid_at as string,
      recordedRole: (p.recorded_role as PartyRole) ?? null,
      note: (p.note as string) ?? null,
    })),
    events: (events ?? []).map((e) => ({
      id: e.id as string,
      type: e.type as InvoiceEventView["type"],
      actorRole: (e.actor_role as string) ?? null,
      message: (e.message as string) ?? null,
      amount: e.amount == null ? null : Number(e.amount),
      createdAt: e.created_at as string,
    })),
    viewToken: row.view_token as string,
    viewedAt: (row.viewed_at as string) ?? null,
    disputedAt: (row.disputed_at as string) ?? null,
    disputeReason: (row.dispute_reason as string) ?? null,
    paidAt: (row.paid_at as string) ?? null,
    pdfPath: (row.pdf_path as string) ?? null,
    contract: {
      fuelType: (c?.fuel_type as string) ?? "",
      pricePerGallon: Number(c?.price_per_gallon) || 0,
      quantityGallons: Number(c?.quantity_gallons) || 0,
      deliveryTerms: (c?.delivery_terms as string) ?? null,
      netDays: Number(c?.net_days) || 30,
    },
    vendorAddress: v?.address ?? null,
    buyerId: row.buyer_id as string,
    vendorId: row.vendor_id as string,
  }
}

export async function getInvoice(id: string, viewer: Viewer): Promise<InvoiceDetail | null> {
  if (!isSupabaseConfigured()) {
    const inv = mock().invoices.find((i) => i.id === id)
    if (!inv || !isParty(inv, viewer)) return null
    return { ...inv, ...overdueInfo(inv.dueDate, inv.status) }
  }
  const { data } = await createAdminClient().from("invoices").select("*").eq("id", id).maybeSingle()
  if (!data || !isParty({ buyerId: data.buyer_id as string, vendorId: data.vendor_id as string }, viewer)) return null
  return loadDetail(data as InvoiceRow)
}

export async function getInvoiceByToken(token: string): Promise<InvoiceDetail | null> {
  if (!isSupabaseConfigured()) {
    const inv = mock().invoices.find((i) => i.viewToken === token)
    return inv ? { ...inv, ...overdueInfo(inv.dueDate, inv.status) } : null
  }
  const { data } = await createAdminClient().from("invoices").select("*").eq("view_token", token).maybeSingle()
  if (!data || data.status === "draft") return null
  return loadDetail(data as InvoiceRow)
}

export async function getInvoicePdfBytes(invoice: InvoiceDetail): Promise<Buffer> {
  if (isSupabaseConfigured() && invoice.pdfPath) {
    const { data } = await createAdminClient().storage.from("invoices").download(invoice.pdfPath)
    if (data) return Buffer.from(await data.arrayBuffer())
  }
  return renderInvoicePdf(invoice)
}

// ---------------------------------------------------------------------------
// Invoices — writes (vendor)
// ---------------------------------------------------------------------------
function normalizeLines(input: InvoiceInput["lineItems"]): InvoiceLineItem[] {
  return input.map((l) => {
    const amount =
      l.kind === "fuel" && l.gallons && l.pricePerGallon ? r2(l.gallons * l.pricePerGallon) : r2(l.amount)
    return {
      kind: l.kind,
      description: l.description.trim(),
      deliveryDate: l.deliveryDate || null,
      ticketNumber: l.ticketNumber?.trim() || null,
      gallons: l.kind === "fuel" ? l.gallons ?? null : null,
      pricePerGallon: l.kind === "fuel" ? l.pricePerGallon ?? null : null,
      indexPrice: l.kind === "fuel" ? l.indexPrice ?? null : null,
      deliveryId: l.deliveryId || null,
      amount,
    }
  })
}

async function logEvent(
  invoiceId: string,
  type: InvoiceEventView["type"],
  actor: { id?: string | null; role: string },
  message: string | null = null,
  amount: number | null = null
) {
  await createAdminClient().from("invoice_events").insert({
    invoice_id: invoiceId,
    type,
    actor_id: actor.id ?? null,
    actor_role: actor.role,
    message,
    amount,
  })
}

export async function createInvoice(
  vendorId: string,
  actorProfileId: string,
  input: InvoiceInput
): Promise<Result<{ invoiceId: string }>> {
  const lines = normalizeLines(input.lineItems)
  const totals = computeTotals(lines)

  if (!isSupabaseConfigured()) {
    const store = mock()
    const contract = store.contracts.find((c) => c.id === input.contractId && c.vendorId === vendorId)
    if (!contract) return { ok: false, message: "Contract not found." }
    const seq = store.invoices.length + 1
    const inv = mockInvoice({
      id: `inv-${Date.now()}`,
      number: `AFC-${String(seq).padStart(4, "0")}`,
      status: "draft",
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      lineItems: lines,
      notes: input.notes?.trim() || null,
      contractId: contract.id,
      contractTitle: contract.title,
      buyerId: contract.buyerId,
      buyerName: contract.buyerName,
    })
    store.invoices.unshift(inv)
    await markDeliveriesBilled(lines.map((l) => l.deliveryId ?? "").filter(Boolean), inv.id)
    return { ok: true, invoiceId: inv.id }
  }

  const admin = createAdminClient()
  const { data: contract } = await admin.from("contracts").select("id, buyer_id, vendor_id, is_demo").eq("id", input.contractId).eq("vendor_id", vendorId).maybeSingle()
  if (!contract) return { ok: false, message: "Contract not found." }

  const [{ data: seq, error: seqError }, vendors] = await Promise.all([
    admin.rpc("next_invoice_seq", { p_vendor_id: vendorId }),
    vendorInfo([vendorId]),
  ])
  if (seqError || typeof seq !== "number") return { ok: false, message: "Couldn't allocate an invoice number." }
  const number = `${invoicePrefix(vendors.get(vendorId)?.name ?? "INV")}-${String(seq).padStart(4, "0")}`

  const { data: inv, error } = await admin
    .from("invoices")
    .insert({
      contract_id: contract.id,
      buyer_id: contract.buyer_id,
      vendor_id: vendorId,
      seq,
      number,
      status: "draft",
      issue_date: input.issueDate,
      due_date: input.dueDate,
      subtotal: totals.subtotal,
      fees_total: totals.fees,
      tax_total: totals.tax,
      total: totals.total,
      notes: input.notes?.trim() || null,
      is_demo: Boolean(contract.is_demo),
    })
    .select("id")
    .single()
  if (error || !inv) return { ok: false, message: "Couldn't create the invoice." }

  await admin.from("invoice_line_items").insert(
    lines.map((l, i) => ({
      invoice_id: inv.id,
      position: i,
      kind: l.kind,
      description: l.description,
      delivery_date: l.deliveryDate,
      ticket_number: l.ticketNumber,
      gallons: l.gallons,
      price_per_gallon: l.pricePerGallon,
      index_price: l.indexPrice ?? null,
      delivery_id: l.deliveryId ?? null,
      amount: l.amount,
    }))
  )
  await markDeliveriesBilled(lines.map((l) => l.deliveryId ?? "").filter(Boolean), inv.id as string)
  await logEvent(inv.id as string, "created", { id: actorProfileId, role: "vendor" })
  return { ok: true, invoiceId: inv.id as string }
}

export async function updateInvoice(invoiceId: string, vendorId: string, input: InvoiceInput): Promise<Result> {
  const lines = normalizeLines(input.lineItems)
  const totals = computeTotals(lines)

  if (!isSupabaseConfigured()) {
    const inv = mock().invoices.find((i) => i.id === invoiceId && i.vendorId === vendorId)
    if (!inv) return { ok: false, message: "Invoice not found." }
    if (inv.status !== "draft") return { ok: false, message: "Only drafts can be edited." }
    Object.assign(inv, { issueDate: input.issueDate, dueDate: input.dueDate, notes: input.notes?.trim() || null, lineItems: lines, ...totals, feesTotal: totals.fees, taxTotal: totals.tax })
    inv.balance = r2(inv.total - inv.amountPaid)
    return { ok: true }
  }

  const admin = createAdminClient()
  const { data: inv } = await admin.from("invoices").select("id, status").eq("id", invoiceId).eq("vendor_id", vendorId).maybeSingle()
  if (!inv) return { ok: false, message: "Invoice not found." }
  if (inv.status !== "draft") return { ok: false, message: "Only drafts can be edited." }

  const { error } = await admin
    .from("invoices")
    .update({
      issue_date: input.issueDate,
      due_date: input.dueDate,
      subtotal: totals.subtotal,
      fees_total: totals.fees,
      tax_total: totals.tax,
      total: totals.total,
      notes: input.notes?.trim() || null,
    })
    .eq("id", invoiceId)
  if (error) return { ok: false, message: "Couldn't save the invoice." }

  await admin.from("invoice_line_items").delete().eq("invoice_id", invoiceId)
  await admin.from("invoice_line_items").insert(
    lines.map((l, i) => ({
      invoice_id: invoiceId, position: i, kind: l.kind, description: l.description, delivery_date: l.deliveryDate,
      ticket_number: l.ticketNumber, gallons: l.gallons, price_per_gallon: l.pricePerGallon, index_price: l.indexPrice ?? null, delivery_id: l.deliveryId ?? null, amount: l.amount,
    }))
  )
  await unbillDeliveriesForInvoice(invoiceId)
  await markDeliveriesBilled(lines.map((l) => l.deliveryId ?? "").filter(Boolean), invoiceId)
  return { ok: true }
}

export async function sendInvoice(invoiceId: string, vendorId: string, actorProfileId: string): Promise<Result> {
  if (!isSupabaseConfigured()) {
    const store = mock()
    const inv = store.invoices.find((i) => i.id === invoiceId && i.vendorId === vendorId)
    if (!inv) return { ok: false, message: "Invoice not found." }
    if (inv.status !== "draft") return { ok: false, message: "This invoice was already sent." }
    inv.status = "sent"
    inv.sentAt = new Date().toISOString()
    Object.assign(inv, overdueInfo(inv.dueDate, inv.status))
    mockEvent(inv, "sent", "vendor")
    refreshMockContract(store, inv.contractId)
    await sendEmail({ to: "buyer@metro.demo", template: "invoice-sent", data: { buyerName: inv.buyerName, vendorName: inv.vendorName, invoiceNumber: inv.number, contractTitle: inv.contractTitle, total: money(inv.total), dueDate: inv.dueDate, viewUrl: `${siteUrl()}/invoices/view/${inv.viewToken}` } })
    return { ok: true }
  }

  const admin = createAdminClient()
  const { data: row } = await admin.from("invoices").select("*").eq("id", invoiceId).eq("vendor_id", vendorId).maybeSingle()
  if (!row) return { ok: false, message: "Invoice not found." }
  if (row.status !== "draft") return { ok: false, message: "This invoice was already sent." }
  if (!(Number(row.total) > 0)) return { ok: false, message: "Invoice total must be greater than zero." }

  const sentAt = new Date().toISOString()
  const { error } = await admin.from("invoices").update({ status: "sent", sent_at: sentAt }).eq("id", invoiceId)
  if (error) return { ok: false, message: "Couldn't send the invoice." }

  const detail = await loadDetail({ ...row, status: "sent", sent_at: sentAt } as InvoiceRow)

  // Snapshot PDF at send time.
  try {
    const pdf = await renderInvoicePdf(detail)
    const path = `${vendorId}/${detail.number}.pdf`
    const { error: upErr } = await admin.storage.from("invoices").upload(path, pdf, { contentType: "application/pdf", upsert: true })
    if (!upErr) await admin.from("invoices").update({ pdf_path: path }).eq("id", invoiceId)
    else console.error("invoice pdf upload:", upErr.message)
  } catch (err) {
    console.error("invoice pdf render:", err)
  }

  await logEvent(invoiceId, "sent", { id: actorProfileId, role: "vendor" })

  const buyerEmail = await emailForProfile(detail.buyerId)
  if (buyerEmail) {
    await sendEmail({
      to: buyerEmail,
      template: "invoice-sent",
      data: {
        buyerName: detail.buyerName,
        vendorName: detail.vendorName,
        invoiceNumber: detail.number,
        contractTitle: detail.contractTitle,
        total: money(detail.total),
        dueDate: format(new Date(detail.dueDate + "T12:00:00Z"), "MMMM d, yyyy"),
        viewUrl: `${siteUrl()}/invoices/view/${detail.viewToken}`,
      },
    })
  }
  return { ok: true }
}

export async function voidInvoice(invoiceId: string, vendorId: string, actorProfileId: string, reason?: string): Promise<Result> {
  if (!isSupabaseConfigured()) {
    const store = mock()
    const inv = store.invoices.find((i) => i.id === invoiceId && i.vendorId === vendorId)
    if (!inv) return { ok: false, message: "Invoice not found." }
    if (inv.status === "paid") return { ok: false, message: "Paid invoices can't be voided." }
    inv.status = "void"
    Object.assign(inv, overdueInfo(inv.dueDate, inv.status))
    mockEvent(inv, "voided", "vendor", reason ?? null)
    refreshMockContract(store, inv.contractId)
    return { ok: true }
  }
  const admin = createAdminClient()
  const { data: inv } = await admin.from("invoices").select("id, status").eq("id", invoiceId).eq("vendor_id", vendorId).maybeSingle()
  if (!inv) return { ok: false, message: "Invoice not found." }
  if (inv.status === "paid") return { ok: false, message: "Paid invoices can't be voided." }
  const { error } = await admin.from("invoices").update({ status: "void", voided_at: new Date().toISOString() }).eq("id", invoiceId)
  if (error) return { ok: false, message: "Couldn't void the invoice." }
  await unbillDeliveriesForInvoice(invoiceId)
  await logEvent(invoiceId, "voided", { id: actorProfileId, role: "vendor" }, reason?.trim() || null)
  return { ok: true }
}

export async function resolveDispute(invoiceId: string, vendorId: string, actorProfileId: string, note: string): Promise<Result> {
  const nextStatus = (paid: number): InvoiceStatus => (paid > 0 ? "partially_paid" : "viewed")
  if (!isSupabaseConfigured()) {
    const inv = mock().invoices.find((i) => i.id === invoiceId && i.vendorId === vendorId)
    if (!inv || inv.status !== "disputed") return { ok: false, message: "No open dispute on this invoice." }
    inv.status = nextStatus(inv.amountPaid)
    Object.assign(inv, overdueInfo(inv.dueDate, inv.status))
    mockEvent(inv, "dispute_resolved", "vendor", note || null)
    return { ok: true }
  }
  const admin = createAdminClient()
  const { data: inv } = await admin.from("invoices").select("id, status, amount_paid").eq("id", invoiceId).eq("vendor_id", vendorId).maybeSingle()
  if (!inv || inv.status !== "disputed") return { ok: false, message: "No open dispute on this invoice." }
  const { error } = await admin.from("invoices").update({ status: nextStatus(Number(inv.amount_paid) || 0) }).eq("id", invoiceId)
  if (error) return { ok: false, message: "Couldn't resolve the dispute." }
  await logEvent(invoiceId, "dispute_resolved", { id: actorProfileId, role: "vendor" }, note.trim() || null)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Invoices — writes (buyer / either party)
// ---------------------------------------------------------------------------
export async function disputeInvoice(invoiceId: string, buyerId: string, reason: string): Promise<Result> {
  if (!isSupabaseConfigured()) {
    const inv = mock().invoices.find((i) => i.id === invoiceId && i.buyerId === buyerId)
    if (!inv) return { ok: false, message: "Invoice not found." }
    if (!isOpenStatus(inv.status) || inv.status === "disputed") return { ok: false, message: "This invoice can't be disputed." }
    inv.status = "disputed"
    inv.disputedAt = new Date().toISOString()
    inv.disputeReason = reason
    Object.assign(inv, overdueInfo(inv.dueDate, inv.status))
    mockEvent(inv, "disputed", "buyer", reason)
    return { ok: true }
  }
  const admin = createAdminClient()
  const { data: row } = await admin.from("invoices").select("*").eq("id", invoiceId).eq("buyer_id", buyerId).maybeSingle()
  if (!row) return { ok: false, message: "Invoice not found." }
  if (!isOpenStatus(row.status as InvoiceStatus) || row.status === "disputed") return { ok: false, message: "This invoice can't be disputed." }
  const { error } = await admin.from("invoices").update({ status: "disputed", disputed_at: new Date().toISOString(), dispute_reason: reason }).eq("id", invoiceId)
  if (error) return { ok: false, message: "Couldn't submit the dispute." }
  await logEvent(invoiceId, "disputed", { id: buyerId, role: "buyer" }, reason)

  const detail = await loadDetail(row as InvoiceRow)
  const vendors = await vendorInfo([detail.vendorId])
  const vendorEmail = await emailForProfile(vendors.get(detail.vendorId)?.profileId ?? null)
  if (vendorEmail) {
    await sendEmail({ to: vendorEmail, template: "invoice-disputed", data: { vendorName: detail.vendorName, buyerName: detail.buyerName, invoiceNumber: detail.number, reason, invoiceUrl: `${siteUrl()}/vendor/invoices/${invoiceId}` } })
  }
  return { ok: true }
}

export async function recordPayment(
  invoiceId: string,
  actor: { role: PartyRole; id: string; profileId: string | null },
  input: PaymentInput
): Promise<Result> {
  const amount = r2(input.amount)
  if (!isSupabaseConfigured()) {
    const store = mock()
    const inv = store.invoices.find((i) => i.id === invoiceId)
    if (!inv || !isParty(inv, actor)) return { ok: false, message: "Invoice not found." }
    if (!isOpenStatus(inv.status)) return { ok: false, message: "Payments can only be recorded on open invoices." }
    inv.payments.unshift({ id: `p-${Date.now()}`, amount, method: input.method, reference: input.reference?.trim() || null, paidAt: input.paidAt, recordedRole: actor.role, note: input.note?.trim() || null })
    inv.amountPaid = r2(inv.amountPaid + amount)
    inv.balance = r2(inv.total - inv.amountPaid)
    mockEvent(inv, "payment_recorded", actor.role, input.reference?.trim() || null, amount)
    if (inv.amountPaid >= inv.total) { inv.status = "paid"; inv.paidAt = new Date().toISOString(); mockEvent(inv, "paid", "system") }
    else inv.status = "partially_paid"
    Object.assign(inv, overdueInfo(inv.dueDate, inv.status))
    refreshMockContract(store, inv.contractId)
    return { ok: true }
  }

  const admin = createAdminClient()
  const { data: row } = await admin.from("invoices").select("*").eq("id", invoiceId).maybeSingle()
  if (!row || !isParty({ buyerId: row.buyer_id as string, vendorId: row.vendor_id as string }, actor)) return { ok: false, message: "Invoice not found." }
  if (!isOpenStatus(row.status as InvoiceStatus)) return { ok: false, message: "Payments can only be recorded on open invoices." }

  const { error } = await admin.from("payments").insert({
    invoice_id: invoiceId, amount, method: input.method, reference: input.reference?.trim() || null, paid_at: input.paidAt,
    recorded_by: actor.profileId, recorded_role: actor.role === "admin" ? null : actor.role, note: input.note?.trim() || null,
  })
  if (error) return { ok: false, message: "Couldn't record the payment." }

  const total = Number(row.total) || 0
  const paid = r2((Number(row.amount_paid) || 0) + amount)
  const isPaid = paid >= total
  const status: InvoiceStatus = isPaid ? "paid" : "partially_paid"
  await admin.from("invoices").update({ amount_paid: paid, status, paid_at: isPaid ? new Date().toISOString() : null }).eq("id", invoiceId)
  await logEvent(invoiceId, "payment_recorded", { id: actor.profileId, role: actor.role }, input.reference?.trim() || null, amount)
  if (isPaid) await logEvent(invoiceId, "paid", { role: "system" })

  // Notify the other party.
  const detail = await loadDetail({ ...row, amount_paid: paid, status } as InvoiceRow)
  const vendors = await vendorInfo([detail.vendorId])
  const notifyVendor = actor.role !== "vendor"
  const to = notifyVendor ? await emailForProfile(vendors.get(detail.vendorId)?.profileId ?? null) : await emailForProfile(detail.buyerId)
  if (to) {
    await sendEmail({
      to,
      template: "invoice-payment-recorded",
      data: {
        recipientName: notifyVendor ? detail.vendorName : detail.buyerName,
        recordedBy: notifyVendor ? detail.buyerName : detail.vendorName,
        invoiceNumber: detail.number,
        amount: money(amount),
        method: input.method.toUpperCase(),
        balance: money(detail.balance),
        isPaidInFull: isPaid,
        invoiceUrl: `${siteUrl()}/${notifyVendor ? "vendor" : "buyer"}/invoices/${invoiceId}`,
      },
    })
  }
  return { ok: true }
}

export async function markViewedByToken(token: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const inv = mock().invoices.find((i) => i.viewToken === token)
    if (inv && inv.status === "sent") { inv.status = "viewed"; inv.viewedAt = new Date().toISOString(); mockEvent(inv, "viewed", "link") }
    return
  }
  const admin = createAdminClient()
  const { data } = await admin.from("invoices").select("id, status, viewed_at").eq("view_token", token).maybeSingle()
  if (!data) return
  const now = new Date().toISOString()
  if (!data.viewed_at) await admin.from("invoices").update({ viewed_at: now, ...(data.status === "sent" ? { status: "viewed" } : {}) }).eq("id", data.id)
  else if (data.status === "sent") await admin.from("invoices").update({ status: "viewed" }).eq("id", data.id)
  if (!data.viewed_at) await logEvent(data.id as string, "viewed", { role: "link" }, "Opened from email link")
}

// ---------------------------------------------------------------------------
// Fuel lines (for emissions)
// ---------------------------------------------------------------------------
export interface FuelLine {
  invoiceId: string
  gallons: number
  amount: number
}

export async function listFuelLines(viewer: Viewer): Promise<FuelLine[]> {
  if (!isSupabaseConfigured()) {
    return mock().invoices
      .filter((i) => isParty(i, viewer))
      .flatMap((i) => i.lineItems.filter((l) => l.kind === "fuel" && l.gallons).map((l) => ({ invoiceId: i.id, gallons: l.gallons ?? 0, amount: l.amount })))
  }
  const invoices = await listInvoices(viewer)
  const ids = invoices.map((i) => i.id)
  if (!ids.length) return []
  const out: FuelLine[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await createAdminClient().from("invoice_line_items").select("invoice_id, gallons, amount").eq("kind", "fuel").in("invoice_id", ids.slice(i, i + 200))
    for (const l of data ?? []) out.push({ invoiceId: l.invoice_id as string, gallons: Number(l.gallons) || 0, amount: Number(l.amount) || 0 })
  }
  return out
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------
function agingBuckets(open: InvoiceListItem[]): AgingBucket[] {
  const b: AgingBucket[] = [
    { key: "current", label: "Current", amount: 0, count: 0 },
    { key: "1_30", label: "1–30 days", amount: 0, count: 0 },
    { key: "31_60", label: "31–60", amount: 0, count: 0 },
    { key: "61_90", label: "61–90", amount: 0, count: 0 },
    { key: "90_plus", label: "90+", amount: 0, count: 0 },
  ]
  for (const i of open) {
    const d = i.daysOverdue
    const idx = d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4
    b[idx].amount = r2(b[idx].amount + i.balance)
    b[idx].count += 1
  }
  return b
}

function topNamed(map: Map<string, number>, n = 6): NamedAmount[] {
  return [...map.entries()].map(([name, amount]) => ({ name, amount: r2(amount) })).sort((a, b) => b.amount - a.amount).slice(0, n)
}

function monthlySeries(invoices: InvoiceListItem[], payments: { paidAt: string; amount: number }[], months = 6): MonthPoint[] {
  const series = lastMonths(months).map((m) => ({ ...m, invoiced: 0, paid: 0 }))
  const idx = new Map(series.map((s, i) => [s.month, i]))
  for (const i of invoices) {
    if (i.status === "draft" || i.status === "void") continue
    const k = idx.get(monthKey(i.issueDate))
    if (k != null) series[k].invoiced = r2(series[k].invoiced + i.total)
  }
  for (const p of payments) {
    const k = idx.get(monthKey(p.paidAt))
    if (k != null) series[k].paid = r2(series[k].paid + p.amount)
  }
  return series
}

async function paymentsFor(viewer: Viewer, invoices: InvoiceListItem[]) {
  if (!isSupabaseConfigured()) {
    return mock().invoices.filter((i) => isParty(i, viewer)).flatMap((i) => i.payments.map((p) => ({ paidAt: p.paidAt, amount: p.amount, invoiceId: i.id })))
  }
  const ids = invoices.map((i) => i.id)
  if (!ids.length) return []
  const { data } = await createAdminClient().from("payments").select("invoice_id, amount, paid_at").in("invoice_id", ids)
  return (data ?? []).map((p) => ({ paidAt: p.paid_at as string, amount: Number(p.amount) || 0, invoiceId: p.invoice_id as string }))
}

export async function getVendorInvoiceStats(vendorId: string): Promise<VendorInvoiceStats> {
  const viewer: Viewer = { role: "vendor", id: vendorId }
  const invoices = await listInvoices(viewer)
  const payments = await paymentsFor(viewer, invoices)
  const open = invoices.filter((i) => isOpenStatus(i.status))
  const overdue = open.filter((i) => i.isOverdue)
  const thisMonth = monthKey(todayISO())
  const thisYear = todayISO().slice(0, 4)
  const paidThisMonth = payments.filter((p) => monthKey(p.paidAt) === thisMonth).reduce((s, p) => s + p.amount, 0)
  const paidYtd = payments.filter((p) => p.paidAt.slice(0, 4) === thisYear).reduce((s, p) => s + p.amount, 0)

  const paidInvoices = invoices.filter((i) => i.status === "paid")
  const daysToPay = paidInvoices.map((i) => {
    const last = payments.filter((p) => p.invoiceId === i.id).map((p) => p.paidAt).sort().pop()
    return last ? daysBetween(i.sentAt?.slice(0, 10) ?? i.issueDate, last) : null
  }).filter((d): d is number => d != null && d >= 0)

  const byBuyer = new Map<string, number>()
  for (const i of invoices) if (i.status !== "draft" && i.status !== "void") byBuyer.set(i.buyerName, (byBuyer.get(i.buyerName) ?? 0) + i.total)

  return {
    outstanding: r2(open.reduce((s, i) => s + i.balance, 0)),
    overdue: r2(overdue.reduce((s, i) => s + i.balance, 0)),
    overdueCount: overdue.length,
    paidThisMonth: r2(paidThisMonth),
    paidYtd: r2(paidYtd),
    avgDaysToPay: daysToPay.length ? Math.round(daysToPay.reduce((s, d) => s + d, 0) / daysToPay.length) : null,
    openCount: open.length,
    aging: agingBuckets(open),
    byBuyer: topNamed(byBuyer),
    monthly: monthlySeries(invoices, payments),
  }
}

export async function getBuyerInvoiceStats(buyerId: string): Promise<BuyerInvoiceStats> {
  const viewer: Viewer = { role: "buyer", id: buyerId }
  const [invoices, contracts] = await Promise.all([listInvoices(viewer), listContracts(viewer)])
  const payments = await paymentsFor(viewer, invoices)
  const open = invoices.filter((i) => isOpenStatus(i.status))
  const overdue = open.filter((i) => i.isOverdue)
  const today = todayISO()
  const weekOut = addDays(today, 7)
  const dueThisWeek = open.filter((i) => !i.isOverdue && i.dueDate >= today && i.dueDate <= weekOut)
  const thisYear = today.slice(0, 4)

  const bySupplier = new Map<string, number>()
  const byFuel = new Map<string, number>()
  const contractMap = new Map(contracts.map((c) => [c.id, c]))
  for (const i of invoices) {
    if (i.status === "draft" || i.status === "void") continue
    bySupplier.set(i.vendorName, (bySupplier.get(i.vendorName) ?? 0) + i.total)
    const fuel = contractMap.get(i.contractId)?.fuelType || "Other"
    byFuel.set(fuel, (byFuel.get(fuel) ?? 0) + i.total)
  }

  // Actual $/gal (from fuel lines) vs awarded $/gal, per contract.
  let priceVsAwarded: BuyerInvoiceStats["priceVsAwarded"] = []
  if (isSupabaseConfigured()) {
    const ids = invoices.filter((i) => i.status !== "draft" && i.status !== "void").map((i) => i.id)
    if (ids.length) {
      const { data: lines } = await createAdminClient().from("invoice_line_items").select("invoice_id, gallons, amount").eq("kind", "fuel").in("invoice_id", ids)
      const perContract = new Map<string, { gal: number; amt: number }>()
      const invContract = new Map(invoices.map((i) => [i.id, i.contractId]))
      for (const l of lines ?? []) {
        const cid = invContract.get(l.invoice_id as string)
        if (!cid) continue
        const a = perContract.get(cid) ?? { gal: 0, amt: 0 }
        a.gal += Number(l.gallons) || 0
        a.amt += Number(l.amount) || 0
        perContract.set(cid, a)
      }
      priceVsAwarded = [...perContract.entries()].map(([cid, a]) => ({
        contract: contractMap.get(cid)?.title ?? "Contract",
        awarded: contractMap.get(cid)?.pricePerGallon ?? 0,
        actual: a.gal ? Math.round((a.amt / a.gal) * 10000) / 10000 : 0,
      })).filter((p) => p.awarded > 0 && p.actual > 0).slice(0, 5)
    }
  } else {
    const store = mock()
    for (const c of contracts) {
      const fuelLines = store.invoices.filter((i) => i.contractId === c.id && i.status !== "draft" && i.status !== "void").flatMap((i) => i.lineItems.filter((l) => l.kind === "fuel"))
      const gal = fuelLines.reduce((s, l) => s + (l.gallons ?? 0), 0)
      const amt = fuelLines.reduce((s, l) => s + l.amount, 0)
      if (gal) priceVsAwarded.push({ contract: c.title, awarded: c.pricePerGallon, actual: Math.round((amt / gal) * 10000) / 10000 })
    }
  }

  return {
    outstanding: r2(open.reduce((s, i) => s + i.balance, 0)),
    dueThisWeek: r2(dueThisWeek.reduce((s, i) => s + i.balance, 0)),
    dueThisWeekCount: dueThisWeek.length,
    overdue: r2(overdue.reduce((s, i) => s + i.balance, 0)),
    overdueCount: overdue.length,
    spendYtd: r2(invoices.filter((i) => i.status !== "draft" && i.status !== "void" && i.issueDate.slice(0, 4) === thisYear).reduce((s, i) => s + i.total, 0)),
    disputedCount: invoices.filter((i) => i.status === "disputed").length,
    bySupplier: topNamed(bySupplier),
    byFuel: topNamed(byFuel),
    priceVsAwarded,
    monthly: monthlySeries(invoices, payments),
  }
}

export async function getAdminInvoiceStats(): Promise<AdminInvoiceStats> {
  const invoices = await listInvoices({ role: "admin", id: "admin" })
  const live = invoices.filter((i) => i.status !== "draft" && i.status !== "void")
  const open = live.filter((i) => isOpenStatus(i.status))
  const byVendor = new Map<string, number>()
  const byBuyer = new Map<string, number>()
  for (const i of live) {
    byVendor.set(i.vendorName, (byVendor.get(i.vendorName) ?? 0) + i.total)
    byBuyer.set(i.buyerName, (byBuyer.get(i.buyerName) ?? 0) + i.total)
  }
  return {
    invoicedTotal: r2(live.reduce((s, i) => s + i.total, 0)),
    paidTotal: r2(live.reduce((s, i) => s + i.amountPaid, 0)),
    outstanding: r2(open.reduce((s, i) => s + i.balance, 0)),
    overdue: r2(open.filter((i) => i.isOverdue).reduce((s, i) => s + i.balance, 0)),
    invoiceCount: live.length,
    topVendors: topNamed(byVendor, 5),
    topBuyers: topNamed(byBuyer, 5),
  }
}
