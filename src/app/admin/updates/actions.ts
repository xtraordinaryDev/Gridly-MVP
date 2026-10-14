"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdmin } from "@/lib/auth"
import { isUuid } from "@/lib/storage/paths"
import {
  addUpdateContacts,
  deleteUpdateContact,
  getUpdateSend,
  listUpdateSendRecipients,
  sendUpdateTest,
  sendUpdateToContacts,
  updateUpdateContact,
  type UpdateSendRecipient,
} from "@/lib/data/updates"
import { siteUrl } from "@/lib/email"
import { CONTACT_STATUSES, CONTACT_TYPES, EMAIL_RE, ensureHtml, parseContactLines, personalize } from "@/lib/updates/html"

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; message: string }

const typeSchema = z.enum(CONTACT_TYPES)
const statusSchema = z.enum(CONTACT_STATUSES)

const MAX_HTML = 400_000 // ~400 KB; Resend's limit is far higher but email clients clip around 100 KB

const GROUP_MAX = 40
const cleanGroup = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, GROUP_MAX) : "") || null

export async function addContactsAction(input: {
  text: string
  defaultType: string
  group?: string
}): Promise<ActionResult<{ added: number; updated: number; rejected: string[] }>> {
  const { profile } = await requireAdmin()
  const text = typeof input?.text === "string" ? input.text.slice(0, 200_000) : ""
  const defaultType = typeSchema.safeParse(input?.defaultType)
  const { contacts, rejected } = parseContactLines(text, defaultType.success ? defaultType.data : "other")
  if (contacts.length === 0) {
    return { ok: false, message: rejected.length ? `No valid addresses found. ${rejected.length} line(s) couldn't be read.` : "Paste at least one email address." }
  }
  try {
    const result = await addUpdateContacts(contacts, profile.id, cleanGroup(input?.group))
    revalidatePath("/admin/updates")
    return { ok: true, data: { ...result, rejected } }
  } catch (err) {
    console.error("[updates] addContactsAction:", err)
    return { ok: false, message: "Couldn't save the contacts." }
  }
}

export async function updateContactAction(input: {
  id: string
  status?: string
  contactType?: string
  fullName?: string
  company?: string
  notes?: string
  groupName?: string
}): Promise<ActionResult> {
  await requireAdmin()
  if (!isUuid(input?.id)) return { ok: false, message: "Contact not found." }
  const patch: Parameters<typeof updateUpdateContact>[1] = {}
  if (input.status !== undefined) {
    const p = statusSchema.safeParse(input.status)
    if (!p.success) return { ok: false, message: "Invalid status." }
    patch.status = p.data
  }
  if (input.contactType !== undefined) {
    const p = typeSchema.safeParse(input.contactType)
    if (!p.success) return { ok: false, message: "Invalid type." }
    patch.contactType = p.data
  }
  if (input.fullName !== undefined) patch.fullName = String(input.fullName).trim().slice(0, 120) || null
  if (input.company !== undefined) patch.company = String(input.company).trim().slice(0, 120) || null
  if (input.notes !== undefined) patch.notes = String(input.notes).trim().slice(0, 2000) || null
  if (input.groupName !== undefined) patch.groupName = cleanGroup(input.groupName)
  try {
    await updateUpdateContact(input.id, patch)
    revalidatePath("/admin/updates")
    return { ok: true, data: undefined }
  } catch (err) {
    console.error("[updates] updateContactAction:", err)
    return { ok: false, message: "Couldn't update the contact." }
  }
}

export async function deleteContactAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  if (!isUuid(id)) return { ok: false, message: "Contact not found." }
  try {
    await deleteUpdateContact(id)
    revalidatePath("/admin/updates")
    return { ok: true, data: undefined }
  } catch (err) {
    console.error("[updates] deleteContactAction:", err)
    return { ok: false, message: "Couldn't delete the contact." }
  }
}

const sendSchema = z
  .object({
    subject: z.string().trim().min(1, "Add a subject line.").max(200, "Subject is too long."),
    html: z.string().trim().min(1, "Write or paste a message.").max(MAX_HTML, "The message is too large to send as an email."),
  })
  .transform((v) => ({ ...v, html: ensureHtml(v.html) }))

export async function sendUpdateAction(input: {
  subject: string
  html: string
  contactIds: string[]
}): Promise<ActionResult<{ sendId: string | null; sent: number; failed: number; skipped: number }>> {
  const { profile } = await requireAdmin()
  const parsed = sendSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." }
  const ids = Array.isArray(input?.contactIds) ? input.contactIds.filter((v): v is string => typeof v === "string" && isUuid(v)) : []
  if (ids.length === 0) return { ok: false, message: "Select at least one contact." }
  if (ids.length > 5000) return { ok: false, message: "Send to at most 5,000 contacts at a time." }
  try {
    const result = await sendUpdateToContacts({ ...parsed.data, contactIds: ids, sentBy: profile.id })
    revalidatePath("/admin/updates")
    return { ok: true, data: result }
  } catch (err) {
    console.error("[updates] sendUpdateAction:", err)
    return { ok: false, message: "The send failed before any email went out." }
  }
}

export async function sendTestAction(input: { subject: string; html: string; to: string }): Promise<ActionResult> {
  const { profile } = await requireAdmin()
  const parsed = sendSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." }
  const to = typeof input?.to === "string" ? input.to.trim().toLowerCase() : ""
  if (!EMAIL_RE.test(to)) return { ok: false, message: "Enter a valid email address for the test." }
  try {
    const result = await sendUpdateTest({ ...parsed.data, to, fullName: profile.fullName })
    if (result.error) return { ok: false, message: `Resend rejected the test: ${result.error}` }
    return { ok: true, data: undefined }
  } catch (err) {
    console.error("[updates] sendTestAction:", err)
    return { ok: false, message: "Couldn't send the test email." }
  }
}

export async function sendRecipientsAction(sendId: string): Promise<ActionResult<UpdateSendRecipient[]>> {
  await requireAdmin()
  if (!isUuid(sendId)) return { ok: false, message: "Send not found." }
  return { ok: true, data: await listUpdateSendRecipients(sendId) }
}

/** Everything the History dialog shows: the email as sent plus every recipient's result. */
export async function sendDetailAction(
  sendId: string
): Promise<ActionResult<{ subject: string; html: string; createdAt: string; recipients: UpdateSendRecipient[] }>> {
  await requireAdmin()
  if (!isUuid(sendId)) return { ok: false, message: "Send not found." }
  const [send, recipients] = await Promise.all([getUpdateSend(sendId), listUpdateSendRecipients(sendId)])
  if (!send) return { ok: false, message: "Send not found." }
  // Each recipient got their own merged copy; show the preview the way the first recipient saw it.
  const sample = recipients[0]
  const html = personalize(send.html, { fullName: sample?.fullName ?? null, unsubscribeUrl: `${siteUrl()}/updates/unsubscribe/preview` })
  return { ok: true, data: { ...send, html, recipients } }
}
