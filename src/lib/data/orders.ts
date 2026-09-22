import "server-only"

import { format } from "date-fns"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { sendEmail, siteUrl } from "@/lib/email"
import { listContracts } from "@/lib/data/invoices"
import type { ContractSummary, Viewer } from "@/lib/invoicing/types"
import type { OrderStatus } from "@/lib/schemas/orders"

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string }

export interface OrderView {
  id: string
  contractId: string
  contractTitle: string
  fuelType: string
  buyerId: string
  buyerName: string
  vendorId: string
  vendorName: string
  siteAddress: string
  gallons: number
  windowStart: string
  windowEnd: string
  urgency: "standard" | "rush" | "emergency"
  notes: string | null
  status: OrderStatus
  scheduledFor: string | null
  confirmedAt: string | null
  cancelledReason: string | null
  createdAt: string
  isLate: boolean
}

export interface DeliveryView {
  id: string
  orderId: string | null
  contractId: string
  contractTitle: string
  fuelType: string
  buyerId: string
  buyerName: string
  vendorId: string
  vendorName: string
  deliveredAt: string
  siteAddress: string
  gallons: number
  ticketNumber: string | null
  bolPath: string | null
  notes: string | null
  onTime: boolean | null
  invoiceId: string | null
  createdAt: string
}

export interface OrderInput {
  contractId: string
  siteAddress: string
  gallons: number
  windowStart: string
  windowEnd: string
  urgency: "standard" | "rush" | "emergency"
  notes?: string | null
}

export interface DeliveryInput {
  contractId: string
  orderId?: string | null
  deliveredAt: string
  siteAddress: string
  gallons: number
  ticketNumber?: string | null
  bolPath?: string | null
  notes?: string | null
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const fmtDate = (iso: string) => format(new Date(iso + "T12:00:00Z"), "MMM d, yyyy")

function isParty(row: { buyerId: string; vendorId: string }, viewer: Viewer) {
  if (viewer.role === "admin") return true
  return viewer.role === "buyer" ? row.buyerId === viewer.id : row.vendorId === viewer.id
}

// ---------------------------------------------------------------------------
// Preview mock
// ---------------------------------------------------------------------------
interface MockStore { orders: OrderView[]; deliveries: DeliveryView[] }
function mock(): MockStore {
  const g = globalThis as unknown as { __gridlinkOrdersMock?: MockStore }
  if (!g.__gridlinkOrdersMock) {
    const base = { contractId: "contract-schooldist", contractTitle: "Heating Oil & Diesel — Annual Contract", fuelType: "Diesel", buyerId: "preview-buyer", buyerName: "Metro Transit Authority", vendorId: "vendor-apex", vendorName: "Apex Fuel Co." }
    const d = (n: number) => { const x = new Date(); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }
    g.__gridlinkOrdersMock = {
      orders: [
        { id: "ord-1", ...base, siteAddress: "1200 Campus Dr, Madison, WI", gallons: 8000, windowStart: d(2), windowEnd: d(4), urgency: "standard", notes: null, status: "requested", scheduledFor: null, confirmedAt: null, cancelledReason: null, createdAt: new Date().toISOString(), isLate: false },
        { id: "ord-2", ...base, siteAddress: "560 6th Ave N, Minneapolis, MN", gallons: 6500, windowStart: d(-1), windowEnd: d(1), urgency: "rush", notes: "Tank at 15%", status: "scheduled", scheduledFor: d(1), confirmedAt: new Date().toISOString(), cancelledReason: null, createdAt: new Date().toISOString(), isLate: false },
        { id: "ord-3", ...base, siteAddress: "1200 Campus Dr, Madison, WI", gallons: 7200, windowStart: d(-12), windowEnd: d(-10), urgency: "standard", notes: null, status: "delivered", scheduledFor: d(-11), confirmedAt: new Date().toISOString(), cancelledReason: null, createdAt: new Date().toISOString(), isLate: false },
      ],
      deliveries: [
        { id: "del-1", orderId: "ord-3", ...base, deliveredAt: d(-11), siteAddress: "1200 Campus Dr, Madison, WI", gallons: 7180, ticketNumber: "T-89410", bolPath: null, notes: null, onTime: true, invoiceId: null, createdAt: new Date().toISOString() },
      ],
    }
  }
  return g.__gridlinkOrdersMock
}

// ---------------------------------------------------------------------------
// Name hydration
// ---------------------------------------------------------------------------
async function contractMap(viewer: Viewer): Promise<Map<string, ContractSummary>> {
  const contracts = await listContracts(viewer)
  return new Map(contracts.map((c) => [c.id, c]))
}

function rowToOrder(r: Record<string, unknown>, c: ContractSummary | undefined): OrderView {
  const status = r.status as OrderStatus
  const windowEnd = r.window_end as string
  return {
    id: r.id as string,
    contractId: r.contract_id as string,
    contractTitle: c?.title ?? "Contract",
    fuelType: c?.fuelType ?? "",
    buyerId: r.buyer_id as string,
    buyerName: c?.buyerName ?? "Buyer",
    vendorId: r.vendor_id as string,
    vendorName: c?.vendorName ?? "Supplier",
    siteAddress: r.site_address as string,
    gallons: Number(r.gallons) || 0,
    windowStart: r.window_start as string,
    windowEnd,
    urgency: (r.urgency as OrderView["urgency"]) ?? "standard",
    notes: (r.notes as string) ?? null,
    status,
    scheduledFor: (r.scheduled_for as string) ?? null,
    confirmedAt: (r.confirmed_at as string) ?? null,
    cancelledReason: (r.cancelled_reason as string) ?? null,
    createdAt: r.created_at as string,
    isLate: !["delivered", "cancelled"].includes(status) && windowEnd < todayISO(),
  }
}

function rowToDelivery(r: Record<string, unknown>, c: ContractSummary | undefined): DeliveryView {
  return {
    id: r.id as string,
    orderId: (r.order_id as string) ?? null,
    contractId: r.contract_id as string,
    contractTitle: c?.title ?? "Contract",
    fuelType: c?.fuelType ?? "",
    buyerId: r.buyer_id as string,
    buyerName: c?.buyerName ?? "Buyer",
    vendorId: r.vendor_id as string,
    vendorName: c?.vendorName ?? "Supplier",
    deliveredAt: r.delivered_at as string,
    siteAddress: r.site_address as string,
    gallons: Number(r.gallons) || 0,
    ticketNumber: (r.ticket_number as string) ?? null,
    bolPath: (r.bol_path as string) ?? null,
    notes: (r.notes as string) ?? null,
    onTime: r.on_time == null ? null : Boolean(r.on_time),
    invoiceId: (r.invoice_id as string) ?? null,
    createdAt: r.created_at as string,
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function listOrders(viewer: Viewer, opts: { contractId?: string } = {}): Promise<OrderView[]> {
  if (!isSupabaseConfigured()) {
    return mock().orders.filter((o) => isParty(o, viewer) && (!opts.contractId || o.contractId === opts.contractId))
  }
  let q = createAdminClient().from("orders").select("*").order("created_at", { ascending: false })
  if (viewer.role === "buyer") q = q.eq("buyer_id", viewer.id)
  if (viewer.role === "vendor") q = q.eq("vendor_id", viewer.id)
  if (opts.contractId) q = q.eq("contract_id", opts.contractId)
  const [{ data }, cmap] = await Promise.all([q, contractMap(viewer)])
  return (data ?? []).map((r) => rowToOrder(r as Record<string, unknown>, cmap.get(r.contract_id as string)))
}

export async function getOrder(id: string, viewer: Viewer): Promise<OrderView | null> {
  const all = await listOrders(viewer)
  return all.find((o) => o.id === id) ?? null
}

export async function listDeliveries(viewer: Viewer, opts: { contractId?: string; unbilledOnly?: boolean } = {}): Promise<DeliveryView[]> {
  if (!isSupabaseConfigured()) {
    return mock().deliveries.filter((d) => isParty(d, viewer) && (!opts.contractId || d.contractId === opts.contractId) && (!opts.unbilledOnly || !d.invoiceId))
  }
  let q = createAdminClient().from("deliveries").select("*").order("delivered_at", { ascending: false })
  if (viewer.role === "buyer") q = q.eq("buyer_id", viewer.id)
  if (viewer.role === "vendor") q = q.eq("vendor_id", viewer.id)
  if (opts.contractId) q = q.eq("contract_id", opts.contractId)
  if (opts.unbilledOnly) q = q.is("invoice_id", null)
  const [{ data }, cmap] = await Promise.all([q, contractMap(viewer)])
  return (data ?? []).map((r) => rowToDelivery(r as Record<string, unknown>, cmap.get(r.contract_id as string)))
}

export interface ContractFulfilment {
  orderedGallons: number
  deliveredGallons: number
  unbilledGallons: number
  openOrders: number
  onTimePct: number | null
}

export function summarizeFulfilment(orders: OrderView[], deliveries: DeliveryView[]): ContractFulfilment {
  const rated = deliveries.filter((d) => d.onTime != null)
  return {
    orderedGallons: orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.gallons, 0),
    deliveredGallons: deliveries.reduce((s, d) => s + d.gallons, 0),
    unbilledGallons: deliveries.filter((d) => !d.invoiceId).reduce((s, d) => s + d.gallons, 0),
    openOrders: orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
    onTimePct: rated.length ? Math.round((rated.filter((d) => d.onTime).length / rated.length) * 100) : null,
  }
}

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------
async function emailForProfile(profileId: string | null) {
  if (!profileId) return null
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(profileId)
    return data.user?.email ?? null
  } catch { return null }
}
async function vendorEmail(vendorId: string) {
  const { data } = await createAdminClient().from("vendors").select("profile_id").eq("id", vendorId).maybeSingle()
  return emailForProfile((data?.profile_id as string) ?? null)
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------
export async function createOrder(buyerId: string, input: OrderInput): Promise<Result<{ orderId: string }>> {
  if (!isSupabaseConfigured()) {
    const c = (await listContracts({ role: "buyer", id: buyerId })).find((x) => x.id === input.contractId)
    if (!c) return { ok: false, message: "Contract not found." }
    const id = `ord-${Date.now()}`
    mock().orders.unshift({ id, contractId: c.id, contractTitle: c.title, fuelType: c.fuelType, buyerId, buyerName: c.buyerName, vendorId: c.vendorId, vendorName: c.vendorName, siteAddress: input.siteAddress, gallons: input.gallons, windowStart: input.windowStart, windowEnd: input.windowEnd, urgency: input.urgency, notes: input.notes ?? null, status: "requested", scheduledFor: null, confirmedAt: null, cancelledReason: null, createdAt: new Date().toISOString(), isLate: false })
    return { ok: true, orderId: id }
  }
  const admin = createAdminClient()
  const { data: c } = await admin.from("contracts").select("id, buyer_id, vendor_id, title, is_demo, status").eq("id", input.contractId).eq("buyer_id", buyerId).maybeSingle()
  if (!c) return { ok: false, message: "Contract not found." }
  if (c.status !== "active") return { ok: false, message: "This contract is no longer active." }
  const { data, error } = await admin.from("orders").insert({
    contract_id: c.id, buyer_id: buyerId, vendor_id: c.vendor_id, site_address: input.siteAddress.trim(), gallons: input.gallons,
    window_start: input.windowStart, window_end: input.windowEnd, urgency: input.urgency, notes: input.notes?.trim() || null, is_demo: Boolean(c.is_demo),
  }).select("id").single()
  if (error || !data) return { ok: false, message: "Couldn't place the order." }

  const to = await vendorEmail(c.vendor_id as string)
  const buyers = await admin.from("profiles").select("company_name").eq("id", buyerId).maybeSingle()
  if (to) {
    await sendEmail({
      to,
      template: "order-event",
      data: {
        recipientName: "there",
        headline: input.urgency === "emergency" ? "EMERGENCY fuel order" : "New fuel order",
        intro: `${(buyers.data?.company_name as string) ?? "A buyer"} placed an order on ${c.title as string}.`,
        rows: [
          ["Site", input.siteAddress],
          ["Gallons", input.gallons.toLocaleString("en-US")],
          ["Window", `${fmtDate(input.windowStart)} – ${fmtDate(input.windowEnd)}`],
          ["Urgency", input.urgency],
        ],
        ctaLabel: "Confirm order",
        ctaUrl: `${siteUrl()}/vendor/orders`,
      },
    })
  }
  return { ok: true, orderId: data.id as string }
}

export async function confirmOrder(vendorId: string, orderId: string, scheduledFor: string, note?: string): Promise<Result> {
  if (!isSupabaseConfigured()) {
    const o = mock().orders.find((x) => x.id === orderId && x.vendorId === vendorId)
    if (!o) return { ok: false, message: "Order not found." }
    if (!["requested", "confirmed"].includes(o.status)) return { ok: false, message: "This order can't be scheduled." }
    o.status = "scheduled"; o.scheduledFor = scheduledFor; o.confirmedAt = new Date().toISOString(); o.isLate = false
    return { ok: true }
  }
  const admin = createAdminClient()
  const { data: o } = await admin.from("orders").select("*").eq("id", orderId).eq("vendor_id", vendorId).maybeSingle()
  if (!o) return { ok: false, message: "Order not found." }
  if (!["requested", "confirmed"].includes(o.status as string)) return { ok: false, message: "This order can't be scheduled." }
  const { error } = await admin.from("orders").update({ status: "scheduled", scheduled_for: scheduledFor, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString(), notes: note?.trim() ? `${(o.notes as string) ?? ""}\nSupplier: ${note.trim()}`.trim() : o.notes }).eq("id", orderId)
  if (error) return { ok: false, message: "Couldn't confirm the order." }
  const to = await emailForProfile(o.buyer_id as string)
  const { data: c } = await admin.from("contracts").select("title").eq("id", o.contract_id as string).maybeSingle()
  if (to) {
    await sendEmail({ to, template: "order-event", data: { recipientName: "there", headline: "Delivery scheduled", intro: `Your order on ${(c?.title as string) ?? "your contract"} is scheduled.`, rows: [["Site", o.site_address as string], ["Gallons", Number(o.gallons).toLocaleString("en-US")], ["Scheduled for", fmtDate(scheduledFor)]], ctaLabel: "View order", ctaUrl: `${siteUrl()}/buyer/contracts/${o.contract_id as string}` } })
  }
  return { ok: true }
}

export async function cancelOrder(actor: Viewer, orderId: string, reason?: string): Promise<Result> {
  if (!isSupabaseConfigured()) {
    const o = mock().orders.find((x) => x.id === orderId && isParty(x, actor))
    if (!o) return { ok: false, message: "Order not found." }
    if (o.status === "delivered") return { ok: false, message: "Delivered orders can't be cancelled." }
    o.status = "cancelled"; o.cancelledReason = reason?.trim() || null; o.isLate = false
    return { ok: true }
  }
  const admin = createAdminClient()
  const { data: o } = await admin.from("orders").select("id, status, buyer_id, vendor_id").eq("id", orderId).maybeSingle()
  if (!o || !isParty({ buyerId: o.buyer_id as string, vendorId: o.vendor_id as string }, actor)) return { ok: false, message: "Order not found." }
  if (o.status === "delivered") return { ok: false, message: "Delivered orders can't be cancelled." }
  const { error } = await admin.from("orders").update({ status: "cancelled", cancelled_reason: reason?.trim() || null, updated_at: new Date().toISOString() }).eq("id", orderId)
  return error ? { ok: false, message: "Couldn't cancel the order." } : { ok: true }
}

export async function logDelivery(vendorId: string, input: DeliveryInput): Promise<Result<{ deliveryId: string }>> {
  if (!isSupabaseConfigured()) {
    const store = mock()
    const c = (await listContracts({ role: "vendor", id: vendorId })).find((x) => x.id === input.contractId)
    if (!c) return { ok: false, message: "Contract not found." }
    const order = input.orderId ? store.orders.find((o) => o.id === input.orderId) : null
    const onTime = order ? input.deliveredAt <= order.windowEnd : null
    const id = `del-${Date.now()}`
    store.deliveries.unshift({ id, orderId: order?.id ?? null, contractId: c.id, contractTitle: c.title, fuelType: c.fuelType, buyerId: c.buyerId, buyerName: c.buyerName, vendorId, vendorName: c.vendorName, deliveredAt: input.deliveredAt, siteAddress: input.siteAddress, gallons: input.gallons, ticketNumber: input.ticketNumber || null, bolPath: input.bolPath || null, notes: input.notes || null, onTime, invoiceId: null, createdAt: new Date().toISOString() })
    if (order) { order.status = "delivered"; order.isLate = false }
    return { ok: true, deliveryId: id }
  }
  const admin = createAdminClient()
  const { data: c } = await admin.from("contracts").select("id, buyer_id, vendor_id, title, is_demo").eq("id", input.contractId).eq("vendor_id", vendorId).maybeSingle()
  if (!c) return { ok: false, message: "Contract not found." }
  let onTime: boolean | null = null
  let order: Record<string, unknown> | null = null
  if (input.orderId) {
    const { data: o } = await admin.from("orders").select("*").eq("id", input.orderId).eq("contract_id", c.id).maybeSingle()
    if (!o) return { ok: false, message: "Order not found." }
    if (o.status === "delivered" || o.status === "cancelled") return { ok: false, message: "That order is already closed." }
    order = o
    onTime = input.deliveredAt <= (o.window_end as string)
  }
  const { data, error } = await admin.from("deliveries").insert({
    order_id: order?.id ?? null, contract_id: c.id, buyer_id: c.buyer_id, vendor_id: vendorId, delivered_at: input.deliveredAt, site_address: input.siteAddress.trim(),
    gallons: input.gallons, ticket_number: input.ticketNumber?.trim() || null, bol_path: input.bolPath || null, notes: input.notes?.trim() || null, on_time: onTime, is_demo: Boolean(c.is_demo),
  }).select("id").single()
  if (error || !data) return { ok: false, message: "Couldn't log the delivery." }
  if (order) await admin.from("orders").update({ status: "delivered", updated_at: new Date().toISOString() }).eq("id", order.id as string)

  const to = await emailForProfile(c.buyer_id as string)
  if (to) {
    await sendEmail({ to, template: "order-event", data: { recipientName: "there", headline: "Fuel delivered", intro: `A delivery was logged on ${c.title as string}.`, rows: [["Site", input.siteAddress], ["Gallons", input.gallons.toLocaleString("en-US")], ["Delivered", fmtDate(input.deliveredAt)], ["Ticket", input.ticketNumber || "—"]], ctaLabel: "View contract", ctaUrl: `${siteUrl()}/buyer/contracts/${c.id as string}` } })
  }
  return { ok: true, deliveryId: data.id as string }
}

/** Link deliveries to an invoice (called by the invoice module after lines are saved). */
export async function markDeliveriesBilled(deliveryIds: string[], invoiceId: string | null): Promise<void> {
  const ids = deliveryIds.filter(Boolean)
  if (!ids.length) return
  if (!isSupabaseConfigured()) {
    for (const d of mock().deliveries) if (ids.includes(d.id)) d.invoiceId = invoiceId
    return
  }
  await createAdminClient().from("deliveries").update({ invoice_id: invoiceId }).in("id", ids)
}

export async function unbillDeliveriesForInvoice(invoiceId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    for (const d of mock().deliveries) if (d.invoiceId === invoiceId) d.invoiceId = null
    return
  }
  await createAdminClient().from("deliveries").update({ invoice_id: null }).eq("invoice_id", invoiceId)
}
