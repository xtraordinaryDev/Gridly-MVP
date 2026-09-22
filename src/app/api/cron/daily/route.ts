import { NextResponse } from "next/server"
import { format } from "date-fns"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { sendEmail, siteUrl } from "@/lib/email"
import { autoCloseExpiredRfps } from "@/lib/data/rfps"
import { DOCUMENT_TYPES } from "@/lib/data/documents"
import { money } from "@/lib/invoicing/types"

/**
 * Daily housekeeping. Call with `Authorization: Bearer $CRON_SECRET` (Vercel
 * Cron does this automatically) or `?secret=`. Idempotent per day via
 * reminder_log.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || (auth !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, preview: true })

  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const summary = { closedRfps: 0, docReminders: 0, invoiceReminders: 0, skipped: 0 }

  async function once(kind: string, refId: string): Promise<boolean> {
    const { error } = await admin.from("reminder_log").insert({ kind, ref_id: refId, sent_on: today })
    if (error) { summary.skipped += 1; return false }
    return true
  }
  async function emailForProfile(profileId: string | null) {
    if (!profileId) return null
    const { data } = await admin.auth.admin.getUserById(profileId).catch(() => ({ data: { user: null } }))
    return data.user?.email ?? null
  }
  const daysUntil = (iso: string) => Math.round((new Date(iso + (iso.length === 10 ? "T12:00:00Z" : "")).getTime() - Date.now()) / 86400000)

  // 1. Close RFPs whose bid deadline passed.
  const { count: before } = await admin.from("rfps").select("id", { count: "exact", head: true }).eq("status", "published").lt("bid_due_date", new Date().toISOString())
  await autoCloseExpiredRfps()
  summary.closedRfps = before ?? 0

  // 2. Compliance: document expiry reminders (30 days, 7 days, expired).
  const { data: docs } = await admin.from("vendor_documents").select("id, vendor_id, document_type, file_name, expires_at").not("expires_at", "is", null)
  for (const d of docs ?? []) {
    const days = daysUntil(d.expires_at as string)
    const kind = days < 0 ? "doc-expired" : days <= 7 ? "doc-7d" : days <= 30 ? "doc-30d" : null
    if (!kind) continue
    if (kind === "doc-expired" && days < -1 && new Date().getUTCDay() !== 1) continue // after day one, only nag on Mondays
    if (!(await once(kind, d.id as string))) continue
    const { data: v } = await admin.from("vendors").select("company_name, profile_id").eq("id", d.vendor_id as string).maybeSingle()
    const to = await emailForProfile((v?.profile_id as string) ?? null)
    if (!to) continue
    const label = DOCUMENT_TYPES.find((t) => t.type === d.document_type)?.label ?? (d.document_type as string)
    await sendEmail({
      to,
      template: "order-event",
      data: {
        recipientName: (v?.company_name as string) ?? "there",
        headline: days < 0 ? `${label} has expired` : `${label} expires in ${days} day${days === 1 ? "" : "s"}`,
        intro: days < 0 ? "Buyers see expired documents on your profile. Upload a current copy to stay GridLink Verified." : "Upload a renewed copy before it lapses so your verified status isn't interrupted.",
        rows: [["Document", d.file_name as string], ["Expires", format(new Date((d.expires_at as string) + "T12:00:00Z"), "MMMM d, yyyy")]],
        ctaLabel: "Upload a new copy",
        ctaUrl: `${siteUrl()}/vendor/documents`,
      },
    })
    summary.docReminders += 1
  }

  // 3. Invoice reminders: 3 days before due, on due date, 7 days overdue (then weekly).
  const { data: invoices } = await admin.from("invoices").select("id, number, buyer_id, vendor_id, due_date, total, amount_paid, view_token").in("status", ["sent", "viewed", "partially_paid"])
  for (const inv of invoices ?? []) {
    const days = daysUntil(inv.due_date as string)
    let kind: string | null = null
    if (days === 3) kind = "inv-due-3d"
    else if (days === 0) kind = "inv-due-today"
    else if (days <= -7 && (-days) % 7 === 0) kind = `inv-overdue-${-days}d`
    if (!kind) continue
    if (!(await once(kind, inv.id as string))) continue
    const to = await emailForProfile(inv.buyer_id as string)
    if (!to) continue
    const { data: v } = await admin.from("vendors").select("company_name").eq("id", inv.vendor_id as string).maybeSingle()
    const balance = money((Number(inv.total) || 0) - (Number(inv.amount_paid) || 0))
    await sendEmail({
      to,
      template: "order-event",
      data: {
        recipientName: "there",
        headline: days > 0 ? `Invoice ${inv.number as string} is due in ${days} days` : days === 0 ? `Invoice ${inv.number as string} is due today` : `Invoice ${inv.number as string} is ${-days} days overdue`,
        intro: `${(v?.company_name as string) ?? "Your supplier"} is expecting payment of ${balance}.`,
        rows: [["Invoice", inv.number as string], ["Balance due", balance], ["Due date", format(new Date((inv.due_date as string) + "T12:00:00Z"), "MMMM d, yyyy")]],
        ctaLabel: "View invoice",
        ctaUrl: `${siteUrl()}/invoices/view/${inv.view_token as string}`,
      },
    })
    summary.invoiceReminders += 1
  }

  return NextResponse.json({ ok: true, date: today, ...summary })
}
