import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { sendEmail, siteUrl } from "@/lib/email"
import type { PartyRole, Viewer } from "@/lib/invoicing/types"

export type ThreadType = "rfp" | "contract" | "invoice"

export interface MessageView {
  id: string
  threadType: ThreadType
  threadId: string
  buyerId: string
  vendorId: string | null
  senderRole: PartyRole
  senderName: string
  body: string
  isBroadcast: boolean
  createdAt: string
}

export interface ThreadParty {
  vendorId: string
  vendorName: string
  unread: number
  lastAt: string | null
}

type Result = { ok: true } | { ok: false; message: string }

interface MockStore { messages: MessageView[] }
function mock(): MockStore {
  const g = globalThis as unknown as { __gridlinkMessagesMock?: MockStore }
  if (!g.__gridlinkMessagesMock) {
    g.__gridlinkMessagesMock = {
      messages: [
        { id: "m1", threadType: "rfp", threadId: "rfp-metcouncil", buyerId: "preview-buyer", vendorId: "vendor-apex", senderRole: "vendor", senderName: "Apex Fuel Co.", body: "Is wet-hose required at both depots, or only Heywood?", isBroadcast: false, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: "m2", threadType: "rfp", threadId: "rfp-metcouncil", buyerId: "preview-buyer", vendorId: null, senderRole: "buyer", senderName: "Metro Transit Authority", body: "Clarification for all bidders: wet-hose is required at both depots.", isBroadcast: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: "m3", threadType: "contract", threadId: "contract-schooldist", buyerId: "preview-buyer", vendorId: "vendor-apex", senderRole: "buyer", senderName: "Metro Transit Authority", body: "Can you move the Madison drop to Thursday?", isBroadcast: false, createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
      ],
    }
  }
  return g.__gridlinkMessagesMock
}

async function nameFor(role: PartyRole, id: string | null): Promise<string> {
  if (!id) return role === "admin" ? "GridLink" : "Buyer"
  const admin = createAdminClient()
  if (role === "vendor") {
    const { data } = await admin.from("vendors").select("company_name").eq("id", id).maybeSingle()
    return (data?.company_name as string) ?? "Supplier"
  }
  const { data } = await admin.from("profiles").select("company_name, full_name").eq("id", id).maybeSingle()
  return (data?.company_name as string) || (data?.full_name as string) || "Buyer"
}

/** Resolve who owns a thread: buyer id and (for contract/invoice) vendor id. */
async function threadContext(threadType: ThreadType, threadId: string): Promise<{ buyerId: string; vendorId: string | null } | null> {
  const admin = createAdminClient()
  if (threadType === "rfp") {
    const { data } = await admin.from("rfps").select("buyer_id").eq("id", threadId).maybeSingle()
    return data ? { buyerId: data.buyer_id as string, vendorId: null } : null
  }
  const table = threadType === "contract" ? "contracts" : "invoices"
  const { data } = await admin.from(table).select("buyer_id, vendor_id").eq("id", threadId).maybeSingle()
  return data ? { buyerId: data.buyer_id as string, vendorId: data.vendor_id as string } : null
}

async function canAccess(viewer: Viewer, ctx: { buyerId: string; vendorId: string | null }, threadType: ThreadType, threadId: string, vendorId: string | null): Promise<boolean> {
  if (viewer.role === "admin") return true
  if (viewer.role === "buyer") return ctx.buyerId === viewer.id
  // vendor
  if (threadType !== "rfp") return ctx.vendorId === viewer.id
  if (vendorId && vendorId !== viewer.id) return false
  const { data } = await createAdminClient().from("rfp_invitations").select("id").eq("rfp_id", threadId).eq("vendor_id", viewer.id).maybeSingle()
  return !!data
}

/**
 * Messages in a thread. For RFPs, a vendor sees their private thread plus
 * broadcasts; a buyer passes `vendorId` to pick which supplier's thread.
 */
export async function listThread(viewer: Viewer, threadType: ThreadType, threadId: string, vendorId: string | null = null): Promise<MessageView[]> {
  const vid = viewer.role === "vendor" ? viewer.id : vendorId
  if (!isSupabaseConfigured()) {
    return mock().messages.filter((m) => m.threadType === threadType && m.threadId === threadId && (m.isBroadcast || m.vendorId === vid || (vid == null && threadType !== "rfp"))).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
  const ctx = await threadContext(threadType, threadId)
  if (!ctx || !(await canAccess(viewer, ctx, threadType, threadId, vid))) return []
  let q = createAdminClient().from("messages").select("*").eq("thread_type", threadType).eq("thread_id", threadId).order("created_at")
  if (threadType === "rfp") q = vid ? q.or(`vendor_id.eq.${vid},is_broadcast.eq.true`) : q.eq("is_broadcast", true)
  const { data } = await q
  const rows = data ?? []
  // mark read for the viewer
  const unreadIds = rows.filter((r) => (viewer.role === "buyer" ? !r.read_by_buyer && r.sender_role !== "buyer" : !r.read_by_vendor && r.sender_role !== "vendor")).map((r) => r.id as string)
  if (unreadIds.length) await createAdminClient().from("messages").update(viewer.role === "buyer" ? { read_by_buyer: true } : { read_by_vendor: true }).in("id", unreadIds)
  const names = new Map<string, string>()
  const out: MessageView[] = []
  for (const r of rows) {
    const key = `${r.sender_role}:${r.sender_role === "vendor" ? r.vendor_id : r.buyer_id}`
    if (!names.has(key)) names.set(key, await nameFor(r.sender_role as PartyRole, (r.sender_role === "vendor" ? r.vendor_id : r.buyer_id) as string | null))
    out.push({ id: r.id as string, threadType, threadId, buyerId: r.buyer_id as string, vendorId: (r.vendor_id as string) ?? null, senderRole: r.sender_role as PartyRole, senderName: names.get(key)!, body: r.body as string, isBroadcast: Boolean(r.is_broadcast), createdAt: r.created_at as string })
  }
  return out
}

/** For a buyer's RFP: one entry per invited supplier, with unread counts. */
export async function listRfpThreadParties(buyerId: string, rfpId: string): Promise<ThreadParty[]> {
  if (!isSupabaseConfigured()) {
    return [{ vendorId: "vendor-apex", vendorName: "Apex Fuel Co.", unread: 1, lastAt: mock().messages[0].createdAt }]
  }
  const admin = createAdminClient()
  const { data: inv } = await admin.from("rfp_invitations").select("vendor_id, vendors(company_name)").eq("rfp_id", rfpId)
  const { data: msgs } = await admin.from("messages").select("vendor_id, read_by_buyer, sender_role, created_at").eq("thread_type", "rfp").eq("thread_id", rfpId).eq("buyer_id", buyerId)
  return (inv ?? []).map((i) => {
    const v = i.vendors as unknown as { company_name: string } | { company_name: string }[] | null
    const name = (Array.isArray(v) ? v[0]?.company_name : v?.company_name) ?? "Supplier"
    const mine = (msgs ?? []).filter((m) => m.vendor_id === i.vendor_id)
    return { vendorId: i.vendor_id as string, vendorName: name, unread: mine.filter((m) => m.sender_role === "vendor" && !m.read_by_buyer).length, lastAt: mine.map((m) => m.created_at as string).sort().pop() ?? null }
  }).sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""))
}

export async function postMessage(viewer: Viewer & { profileId: string | null }, input: { threadType: ThreadType; threadId: string; vendorId?: string | null; body: string; broadcast?: boolean }): Promise<Result> {
  const text = input.body.trim()
  if (!text) return { ok: false, message: "Write a message first." }
  const broadcast = input.threadType === "rfp" && viewer.role === "buyer" && !!input.broadcast
  const vendorId = broadcast ? null : viewer.role === "vendor" ? viewer.id : input.vendorId ?? null

  if (!isSupabaseConfigured()) {
    mock().messages.push({ id: `m-${Date.now()}`, threadType: input.threadType, threadId: input.threadId, buyerId: "preview-buyer", vendorId: input.threadType === "rfp" ? vendorId : "vendor-apex", senderRole: viewer.role, senderName: viewer.role === "buyer" ? "Metro Transit Authority" : "Apex Fuel Co.", body: text, isBroadcast: broadcast, createdAt: new Date().toISOString() })
    return { ok: true }
  }

  const ctx = await threadContext(input.threadType, input.threadId)
  if (!ctx) return { ok: false, message: "Thread not found." }
  if (!(await canAccess(viewer, ctx, input.threadType, input.threadId, vendorId))) return { ok: false, message: "You can't post here." }
  if (input.threadType === "rfp" && !broadcast && !vendorId) return { ok: false, message: "Choose a supplier or broadcast to all." }

  const admin = createAdminClient()
  const resolvedVendor = input.threadType === "rfp" ? vendorId : ctx.vendorId
  const { error } = await admin.from("messages").insert({
    thread_type: input.threadType, thread_id: input.threadId, buyer_id: ctx.buyerId, vendor_id: resolvedVendor, sender_role: viewer.role, sender_id: viewer.profileId, body: text, is_broadcast: broadcast,
    read_by_buyer: viewer.role === "buyer", read_by_vendor: viewer.role === "vendor",
  })
  if (error) return { ok: false, message: "Couldn't send the message." }

  // Notify the other side (broadcasts notify every invited vendor).
  const senderName = await nameFor(viewer.role, viewer.role === "vendor" ? viewer.id : ctx.buyerId)
  const targets: string[] = []
  if (viewer.role === "vendor") {
    const { data } = await admin.auth.admin.getUserById(ctx.buyerId).catch(() => ({ data: { user: null } }))
    if (data.user?.email) targets.push(data.user.email)
  } else {
    let vendorIds: string[] = []
    if (broadcast) {
      const { data } = await admin.from("rfp_invitations").select("vendor_id").eq("rfp_id", input.threadId)
      vendorIds = (data ?? []).map((r) => r.vendor_id as string)
    } else if (resolvedVendor) vendorIds = [resolvedVendor]
    if (vendorIds.length) {
      const { data: vs } = await admin.from("vendors").select("profile_id").in("id", vendorIds)
      for (const v of vs ?? []) {
        if (!v.profile_id) continue
        const { data } = await admin.auth.admin.getUserById(v.profile_id as string).catch(() => ({ data: { user: null } }))
        if (data.user?.email) targets.push(data.user.email)
      }
    }
  }
  const link = viewer.role === "vendor"
    ? `${siteUrl()}/buyer/${input.threadType === "rfp" ? "rfps" : input.threadType === "contract" ? "contracts" : "invoices"}/${input.threadId}`
    : `${siteUrl()}/vendor/${input.threadType === "rfp" ? "opportunities" : input.threadType === "contract" ? "contracts" : "invoices"}/${input.threadId}`
  for (const to of targets) {
    await sendEmail({ to, template: "order-event", data: { recipientName: "there", headline: `New message from ${senderName}`, intro: broadcast ? "The buyer posted an update to all invited suppliers." : "You have a new message on GridLink.", rows: [["Message", text.length > 400 ? text.slice(0, 400) + "…" : text]], ctaLabel: "Reply on GridLink", ctaUrl: link } })
  }
  return { ok: true }
}

/** Unread message count for the viewer, for nav badges. */
export async function unreadCount(viewer: Viewer): Promise<number> {
  if (!isSupabaseConfigured()) return 1
  let q = createAdminClient().from("messages").select("id", { count: "exact", head: true })
  if (viewer.role === "buyer") q = q.eq("buyer_id", viewer.id).eq("read_by_buyer", false).neq("sender_role", "buyer")
  else if (viewer.role === "vendor") q = q.eq("vendor_id", viewer.id).eq("read_by_vendor", false).neq("sender_role", "vendor")
  else return 0
  const { count } = await q
  return count ?? 0
}
