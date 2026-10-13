import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { isEmailConfigured, siteUrl } from "@/lib/email"
import {
  htmlToText,
  personalize,
  type ContactStatus,
  type ContactType,
  type ParsedContact,
} from "@/lib/updates/html"

/* ------------------------------------------------------------------ types */

export type UpdateContact = {
  id: string
  email: string
  fullName: string | null
  company: string | null
  contactType: ContactType
  status: ContactStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type UpdateSendStatus = "sending" | "sent" | "partial" | "failed"

export type UpdateSend = {
  id: string
  subject: string
  status: UpdateSendStatus
  recipientCount: number
  sentCount: number
  failedCount: number
  createdAt: string
  completedAt: string | null
  sentByName: string | null
}

export type UpdateSendRecipient = {
  id: string
  email: string
  fullName: string | null
  status: "queued" | "sent" | "failed"
  error: string | null
}

const s = (v: unknown) => (typeof v === "string" ? v : null)

function rowToContact(r: Record<string, unknown>): UpdateContact {
  return {
    id: r.id as string,
    email: r.email as string,
    fullName: s(r.full_name),
    company: s(r.company),
    contactType: r.contact_type as ContactType,
    status: r.status as ContactStatus,
    notes: s(r.notes),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export function updatesFromAddress() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "GridLink <onboarding@resend.dev>"
}

/* --------------------------------------------------------------- contacts */

export async function listUpdateContacts(): Promise<UpdateContact[]> {
  if (!isSupabaseConfigured()) return []
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("update_contacts")
    .select("id, email, full_name, company, contact_type, status, notes, created_at, updated_at")
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[updates] listUpdateContacts:", error.message)
    return []
  }
  return (data ?? []).map(rowToContact)
}

/**
 * Inserts new addresses and refreshes name / company / type on ones that
 * already exist. Never touches an existing contact's status, so an
 * unsubscribed person who gets pasted again stays unsubscribed.
 */
export async function addUpdateContacts(
  contacts: ParsedContact[],
  createdBy: string | null
): Promise<{ added: number; updated: number }> {
  if (!isSupabaseConfigured() || contacts.length === 0) return { added: 0, updated: 0 }
  const admin = createAdminClient()

  const emails = contacts.map((c) => c.email)
  const { data: existingRows } = await admin.from("update_contacts").select("id, email").in("email", emails)
  const existing = new Map((existingRows ?? []).map((r) => [String(r.email).toLowerCase(), r.id as string]))

  let added = 0
  let updated = 0
  const inserts = contacts
    .filter((c) => !existing.has(c.email))
    .map((c) => ({
      email: c.email,
      full_name: c.fullName,
      company: c.company,
      contact_type: c.contactType,
      created_by: createdBy && /^[0-9a-f-]{36}$/i.test(createdBy) ? createdBy : null,
    }))
  if (inserts.length) {
    const { error, data } = await admin.from("update_contacts").insert(inserts).select("id")
    if (error) throw new Error(error.message)
    added = data?.length ?? 0
  }

  for (const c of contacts) {
    const id = existing.get(c.email)
    if (!id) continue
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (c.fullName) patch.full_name = c.fullName
    if (c.company) patch.company = c.company
    if (c.contactType !== "other") patch.contact_type = c.contactType
    const { error } = await admin.from("update_contacts").update(patch).eq("id", id)
    if (!error) updated++
  }

  return { added, updated }
}

export async function updateUpdateContact(
  id: string,
  patch: Partial<Pick<UpdateContact, "fullName" | "company" | "contactType" | "status" | "notes">>
): Promise<void> {
  if (!isSupabaseConfigured()) return
  const admin = createAdminClient()
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.fullName !== undefined) row.full_name = patch.fullName
  if (patch.company !== undefined) row.company = patch.company
  if (patch.contactType !== undefined) row.contact_type = patch.contactType
  if (patch.status !== undefined) row.status = patch.status
  if (patch.notes !== undefined) row.notes = patch.notes
  const { error } = await admin.from("update_contacts").update(row).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteUpdateContact(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const admin = createAdminClient()
  const { error } = await admin.from("update_contacts").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

/** Public unsubscribe page / one-click header. Idempotent. */
export async function unsubscribeUpdateContact(token: string): Promise<{ ok: boolean; email?: string }> {
  if (!isSupabaseConfigured()) return { ok: false }
  const admin = createAdminClient()
  const { data } = await admin
    .from("update_contacts")
    .select("id, email, status")
    .eq("unsubscribe_token", token)
    .maybeSingle()
  if (!data) return { ok: false }
  if (data.status !== "unsubscribed") {
    await admin
      .from("update_contacts")
      .update({ status: "unsubscribed", updated_at: new Date().toISOString() })
      .eq("id", data.id)
  }
  return { ok: true, email: data.email as string }
}

/* ------------------------------------------------------------------ sends */

export async function listUpdateSends(): Promise<UpdateSend[]> {
  if (!isSupabaseConfigured()) return []
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("update_sends")
    .select("id, subject, status, recipient_count, sent_count, failed_count, created_at, completed_at, sent_by")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) {
    console.error("[updates] listUpdateSends:", error.message)
    return []
  }
  const rows = data ?? []
  const senderIds = [...new Set(rows.map((r) => r.sent_by).filter((v): v is string => typeof v === "string"))]
  const names = new Map<string, string>()
  if (senderIds.length) {
    const { data: profiles } = await admin.from("profiles").select("id, full_name").in("id", senderIds)
    for (const p of profiles ?? []) if (p.full_name) names.set(p.id as string, p.full_name as string)
  }
  return rows.map((r) => ({
    id: r.id as string,
    subject: r.subject as string,
    status: r.status as UpdateSendStatus,
    recipientCount: Number(r.recipient_count ?? 0),
    sentCount: Number(r.sent_count ?? 0),
    failedCount: Number(r.failed_count ?? 0),
    createdAt: r.created_at as string,
    completedAt: s(r.completed_at),
    sentByName: r.sent_by ? (names.get(r.sent_by as string) ?? null) : null,
  }))
}

/** One send with its stored HTML, for the admin's "view email" preview. */
export async function getUpdateSend(sendId: string): Promise<{ subject: string; html: string; createdAt: string } | null> {
  if (!isSupabaseConfigured()) return null
  const admin = createAdminClient()
  const { data } = await admin.from("update_sends").select("subject, html, created_at").eq("id", sendId).maybeSingle()
  if (!data) return null
  return { subject: data.subject as string, html: data.html as string, createdAt: data.created_at as string }
}

export async function listUpdateSendRecipients(sendId: string): Promise<UpdateSendRecipient[]> {
  if (!isSupabaseConfigured()) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from("update_send_recipients")
    .select("id, email, full_name, status, error")
    .eq("send_id", sendId)
    .order("status", { ascending: true })
    .order("email", { ascending: true })
  return (data ?? []).map((r) => ({
    id: r.id as string,
    email: r.email as string,
    fullName: s(r.full_name),
    status: r.status as UpdateSendRecipient["status"],
    error: s(r.error),
  }))
}

type Outgoing = {
  contactId: string | null
  email: string
  fullName: string | null
  html: string
  text: string
  unsubscribeApiUrl: string
}

/** Resend batch limit is 100 messages per call, 2 calls per second. */
const BATCH = 100

async function deliver(
  subject: string,
  messages: Outgoing[]
): Promise<{ id: string | null; error: string | null }[]> {
  const from = updatesFromAddress()

  if (!isEmailConfigured()) {
    for (const m of messages) {
      console.info(`[GridLink email preview] ${JSON.stringify({ to: [m.email], subject, template: "update" })}`)
    }
    return messages.map(() => ({ id: "preview", error: null }))
  }

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const results: { id: string | null; error: string | null }[] = []

  for (let i = 0; i < messages.length; i += BATCH) {
    const chunk = messages.slice(i, i + BATCH)
    if (i > 0) await new Promise((r) => setTimeout(r, 600))
    const { data, error } = await resend.batch.send(
      chunk.map((m) => ({
        from,
        to: m.email,
        subject,
        html: m.html,
        text: m.text,
        headers: {
          "List-Unsubscribe": `<${m.unsubscribeApiUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }))
    )
    if (error) {
      chunk.forEach(() => results.push({ id: null, error: error.message }))
      continue
    }
    const ids = data?.data ?? []
    chunk.forEach((_, j) => results.push({ id: ids[j]?.id ?? null, error: ids[j]?.id ? null : "No message id returned" }))
  }
  return results
}

export async function sendUpdateToContacts(params: {
  subject: string
  html: string
  contactIds: string[]
  sentBy: string | null
}): Promise<{ sendId: string | null; sent: number; failed: number; skipped: number }> {
  if (!isSupabaseConfigured()) {
    // Preview mode: nothing to record, nothing to send.
    return { sendId: null, sent: 0, failed: 0, skipped: params.contactIds.length }
  }
  const admin = createAdminClient()
  const base = siteUrl()

  const { data: rows } = await admin
    .from("update_contacts")
    .select("id, email, full_name, status, unsubscribe_token")
    .in("id", params.contactIds)
  const contacts = rows ?? []
  const eligible = contacts.filter((c) => c.status === "active")
  const skipped = params.contactIds.length - eligible.length

  const sentBy = params.sentBy && /^[0-9a-f-]{36}$/i.test(params.sentBy) ? params.sentBy : null
  const { data: send, error: sendErr } = await admin
    .from("update_sends")
    .insert({ subject: params.subject, html: params.html, recipient_count: eligible.length, sent_by: sentBy })
    .select("id")
    .single()
  if (sendErr || !send) throw new Error(sendErr?.message ?? "Couldn't record the send.")
  const sendId = send.id as string

  if (eligible.length === 0) {
    await admin.from("update_sends").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", sendId)
    return { sendId, sent: 0, failed: 0, skipped }
  }

  const messages: Outgoing[] = eligible.map((c) => {
    const token = c.unsubscribe_token as string
    const unsubscribeUrl = `${base}/updates/unsubscribe/${token}`
    const html = personalize(params.html, { fullName: s(c.full_name), unsubscribeUrl })
    return {
      contactId: c.id as string,
      email: c.email as string,
      fullName: s(c.full_name),
      html,
      text: htmlToText(html),
      unsubscribeApiUrl: `${base}/api/updates/unsubscribe/${token}`,
    }
  })

  const results = await deliver(params.subject, messages)

  const recipientRows = messages.map((m, i) => ({
    send_id: sendId,
    contact_id: m.contactId,
    email: m.email,
    full_name: m.fullName,
    status: results[i].error ? "failed" : "sent",
    resend_id: results[i].id,
    error: results[i].error,
  }))
  await admin.from("update_send_recipients").insert(recipientRows)

  const sent = results.filter((r) => !r.error).length
  const failed = results.length - sent
  await admin
    .from("update_sends")
    .update({
      status: failed === 0 ? "sent" : sent === 0 ? "failed" : "partial",
      sent_count: sent,
      failed_count: failed,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sendId)

  return { sendId, sent, failed, skipped }
}

/** One copy to the admin's own inbox, with sample merge values. Not recorded. */
export async function sendUpdateTest(params: { subject: string; html: string; to: string; fullName: string | null }) {
  const base = siteUrl()
  const html = personalize(params.html, { fullName: params.fullName, unsubscribeUrl: `${base}/updates/unsubscribe/test` })
  const [result] = await deliver(`[TEST] ${params.subject}`, [
    {
      contactId: null,
      email: params.to,
      fullName: params.fullName,
      html,
      text: htmlToText(html),
      unsubscribeApiUrl: `${base}/api/updates/unsubscribe/test`,
    },
  ])
  return result
}
