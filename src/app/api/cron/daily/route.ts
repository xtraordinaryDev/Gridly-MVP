import { createHash, timingSafeEqual } from "node:crypto"

import { NextResponse } from "next/server"
import { format } from "date-fns"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { sendEmail, siteUrl } from "@/lib/email"
import { autoCloseExpiredRfps } from "@/lib/data/rfps"
import { DOCUMENT_TYPES } from "@/lib/data/documents"
import { money } from "@/lib/invoicing/types"
import { refreshRegionalFuelPrices, refreshStationFuelPrices } from "@/lib/fuel-prices"
import { sendDailyOpportunityDigest } from "@/lib/email/notifications"
import { defaultNotificationPrefs, prefsFromRow } from "@/lib/data/vendor"
import { matchesDigestPrefs } from "@/lib/vendor/digest"
import { BUSINESS_TZ, formatRfpDate } from "@/lib/rfp/dates"
import { emailForProfile, vendorContacts } from "@/lib/data/contacts"
import { isCostReportConfigured, syncAnthropicCosts } from "@/lib/ai/cost-report"

/**
 * Daily housekeeping. Call with `Authorization: Bearer $CRON_SECRET` (Vercel
 * Cron does this automatically). Idempotent per day via
 * reminder_log.
 */
export async function GET(request: Request) {
  // Header only: a secret in the query string ends up in access logs and
  // referrers. Hash both sides so the comparison is constant-time and
  // length-independent.
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization") ?? ""
  const digest = (value: string) => createHash("sha256").update(value).digest()
  if (!secret || !timingSafeEqual(digest(auth), digest(`Bearer ${secret}`))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, preview: true })

  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const summary = {
    closedRfps: 0,
    docReminders: 0,
    invoiceReminders: 0,
    opportunityDigests: 0,
    skipped: 0,
    fuelPrices: 0 as number | string,
    stationCells: 0 as number | string,
    sitesGeocoded: 0,
    aiCostDays: 0 as number | string,
  }

  // reminder_log is keyed (kind, ref, day). Reminders check it, send, then
  // write it, so a send that fails or has no recipient is retried next run.
  const dayOffset = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
  async function alreadySent(kind: string, refId: string, since = today): Promise<boolean> {
    const { count } = await admin.from("reminder_log").select("ref_id", { count: "exact", head: true }).eq("kind", kind).eq("ref_id", refId).gte("sent_on", since)
    if (count) summary.skipped += 1
    return !!count
  }
  async function markSent(kind: string, refId: string) {
    const { error } = await admin.from("reminder_log").insert({ kind, ref_id: refId, sent_on: today })
    if (error) console.error("[cron] reminder_log insert failed", kind, refId, error.message)
  }
  // Whole calendar days from today (UTC). Accepts a date or a full timestamp.
  const dayOf = (iso: string) => String(iso).slice(0, 10)
  const daysUntil = (iso: string) => Math.round((Date.parse(`${dayOf(iso)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)
  const longDate = (iso: string) => format(new Date(`${dayOf(iso)}T12:00:00Z`), "MMMM d, yyyy")

  // 0. Regional fuel price benchmarks (EIA publishes Mondays; a daily pull is one request).
  try {
    summary.fuelPrices = (await refreshRegionalFuelPrices()).upserted
  } catch (err) {
    console.error("[cron] fuel price refresh failed", err)
    summary.fuelPrices = "failed"
  }
  // 0b. Station prices near buyer sites (Google Places). Capped per run to bound spend.
  try {
    const r = await refreshStationFuelPrices({ maxCells: Number(process.env.FUEL_STATION_DAILY_CELL_LIMIT) || 30 })
    summary.stationCells = r.cellsRefreshed
    summary.sitesGeocoded = r.geocoded
  } catch (err) {
    console.error("[cron] station price refresh failed", err)
    summary.stationCells = "failed"
  }
  // 0c. Anthropic's official cost report, when an Admin key is configured (Admin → Expenses).
  if (isCostReportConfigured()) {
    try {
      summary.aiCostDays = (await syncAnthropicCosts({ days: 4 })).days
    } catch (err) {
      console.error("[cron] anthropic cost sync failed", err)
      summary.aiCostDays = "failed"
    }
  }

  // 1. Close RFPs whose bid deadline passed.
  const { count: before } = await admin.from("rfps").select("id", { count: "exact", head: true }).eq("status", "published").lt("bid_due_date", new Date().toISOString())
  await autoCloseExpiredRfps()
  summary.closedRfps = before ?? 0

  // 2. Compliance: document expiry reminders — once in the 30-day run-up, once
  //    in the final week, the day after expiry, then Mondays.
  try {
    const { data: docs } = await admin.from("vendor_documents").select("id, vendor_id, document_type, file_name, expires_at").not("expires_at", "is", null)
    const due = (docs ?? [])
      .map((d) => ({ d, days: daysUntil(d.expires_at as string) }))
      .filter(({ days }) => days <= 30)
    // Login email, or the application's sales contact for suppliers without an account.
    const contacts = await vendorContacts(due.map(({ d }) => d.vendor_id as string))
    for (const { d, days } of due) {
      const kind = days < 0 ? "doc-expired" : days <= 7 ? "doc-7d" : "doc-30d"
      if (kind === "doc-expired" && days < -1 && new Date().getUTCDay() !== 1) continue // after day one, only nag on Mondays
      const contact = contacts.get(d.vendor_id as string)
      if (!contact?.email) continue
      // The 30-day and 7-day notices go out once per expiry, not once per day
      // (60 days back comfortably covers the window without muting next year's).
      if (await alreadySent(kind, d.id as string, kind === "doc-expired" ? today : dayOffset(-60))) continue
      const label = DOCUMENT_TYPES.find((t) => t.type === d.document_type)?.label ?? (d.document_type as string)
      const res = await sendEmail({
        to: contact.email,
        template: "order-event",
        data: {
          recipientName: contact.companyName || "there",
          headline: days < 0 ? `${label} has expired` : days === 0 ? `${label} expires today` : `${label} expires in ${days} day${days === 1 ? "" : "s"}`,
          intro: days < 0 ? "Buyers see expired documents on your profile. Upload a current copy to stay GridLink Verified." : "Upload a renewed copy before it lapses so your verified status isn't interrupted.",
          rows: [["Document", d.file_name as string], ["Expires", longDate(d.expires_at as string)]],
          ctaLabel: "Upload a new copy",
          ctaUrl: `${siteUrl()}/vendor/documents`,
        },
      })
      if (!res.ok) continue
      await markSent(kind, d.id as string)
      summary.docReminders += 1
    }
  } catch (err) {
    console.error("[cron] document reminders failed", err)
  }

  // 3. Invoice reminders: 3 days before due, on due date, 7 days overdue (then weekly).
  try {
    const { data: invoices } = await admin.from("invoices").select("id, number, buyer_id, vendor_id, due_date, total, amount_paid, view_token").in("status", ["sent", "viewed", "partially_paid"])
    for (const inv of invoices ?? []) {
      const days = daysUntil(inv.due_date as string)
      let kind: string | null = null
      if (days === 3) kind = "inv-due-3d"
      else if (days === 0) kind = "inv-due-today"
      else if (days <= -7 && (-days) % 7 === 0) kind = `inv-overdue-${-days}d`
      if (!kind) continue
      const to = await emailForProfile(inv.buyer_id as string)
      if (!to) continue
      if (await alreadySent(kind, inv.id as string)) continue
      const { data: v } = await admin.from("vendors").select("company_name").eq("id", inv.vendor_id as string).maybeSingle()
      const balance = money((Number(inv.total) || 0) - (Number(inv.amount_paid) || 0))
      const res = await sendEmail({
        to,
        template: "order-event",
        data: {
          recipientName: "there",
          headline: days > 0 ? `Invoice ${inv.number as string} is due in ${days} days` : days === 0 ? `Invoice ${inv.number as string} is due today` : `Invoice ${inv.number as string} is ${-days} days overdue`,
          intro: `${(v?.company_name as string) ?? "Your supplier"} is expecting payment of ${balance}.`,
          rows: [["Invoice", inv.number as string], ["Balance due", balance], ["Due date", longDate(inv.due_date as string)]],
          ctaLabel: "View invoice",
          ctaUrl: `${siteUrl()}/invoices/view/${inv.view_token as string}`,
        },
      })
      if (!res.ok) continue
      await markSent(kind, inv.id as string)
      summary.invoiceReminders += 1
    }
  } catch (err) {
    console.error("[cron] invoice reminders failed", err)
  }

  // 4. Opportunity digest: open RFPs each vendor is invited to and hasn't
  //    answered, filtered by their notification preferences. Daily vendors get
  //    it every day, weekly vendors on Mondays, "never" not at all.
  try {
    const now = new Date()
    const isMonday = now.toLocaleDateString("en-US", { timeZone: BUSINESS_TZ, weekday: "long" }) === "Monday"
    const dateLabel = now.toLocaleDateString("en-US", { timeZone: BUSINESS_TZ, month: "long", day: "numeric", year: "numeric" })

    const { data: openInvites } = await admin
      .from("rfp_invitations")
      .select("vendor_id, rfp_id, rfps!inner(id, title, buyer_id, fuel_type, quantity_gallons, delivery_states, bid_due_date, status)")
      .is("declined_at", null)
      .eq("rfps.status", "published")
    const invites = (openInvites ?? []).filter((i) => {
      const due = (i.rfps as unknown as { bid_due_date: string | null }).bid_due_date
      return !due || new Date(due).getTime() > now.getTime()
    })
    const vendorIds = [...new Set(invites.map((i) => i.vendor_id as string))]

    if (vendorIds.length) {
      const rfpIds = [...new Set(invites.map((i) => i.rfp_id as string))]
      const buyerIds = [...new Set(invites.map((i) => (i.rfps as unknown as { buyer_id: string }).buyer_id))]
      const [{ data: vendors }, { data: prefRows }, { data: responses }, { data: buyers }] = await Promise.all([
        admin.from("vendors").select("id, company_name, profile_id, products_offered, licensed_states").in("id", vendorIds).not("profile_id", "is", null),
        admin.from("opportunity_notifications").select("*").in("vendor_id", vendorIds),
        // A withdrawn bid no longer counts as a response; the vendor can bid again.
        admin.from("rfp_responses").select("vendor_id, rfp_id").in("rfp_id", rfpIds).eq("status", "submitted"),
        admin.from("profiles").select("id, company_name").in("id", buyerIds),
      ])
      const prefsByVendor = new Map((prefRows ?? []).map((r) => [r.vendor_id as string, prefsFromRow(r)]))
      const responded = new Set((responses ?? []).map((r) => `${r.vendor_id}:${r.rfp_id}`))
      const buyerName = new Map((buyers ?? []).map((b) => [b.id as string, (b.company_name as string) || "Buyer"]))

      for (const v of vendors ?? []) {
        const vendorId = v.id as string
        const prefs = prefsByVendor.get(vendorId) ?? defaultNotificationPrefs({
          productsOffered: (v.products_offered as string[]) ?? [],
          licensedStates: (v.licensed_states as string[]) ?? [],
        })
        if (prefs.emailFrequency === "never") continue
        if (prefs.emailFrequency === "weekly" && !isMonday) continue

        const opportunities = invites
          .filter((i) => i.vendor_id === vendorId && !responded.has(`${vendorId}:${i.rfp_id}`))
          .map((i) => i.rfps as unknown as { id: string; title: string; buyer_id: string; fuel_type: string | null; quantity_gallons: number | null; delivery_states: string[] | null; bid_due_date: string | null })
          .filter((r) => matchesDigestPrefs({ fuelType: r.fuel_type, quantityGallons: Number(r.quantity_gallons) || 0, deliveryStates: r.delivery_states ?? [] }, prefs))
          .sort((a, b) => (a.bid_due_date ?? "9999").localeCompare(b.bid_due_date ?? "9999"))
        if (!opportunities.length) continue

        const to = await emailForProfile(v.profile_id as string)
        if (!to) continue
        if (await alreadySent("opp-digest", vendorId)) continue
        const res = await sendDailyOpportunityDigest({
          vendorEmail: to,
          vendorName: (v.company_name as string) ?? "there",
          dateLabel,
          opportunities: opportunities.map((r) => ({
            id: r.id,
            title: r.title,
            buyer: buyerName.get(r.buyer_id) ?? "Buyer",
            fuelType: r.fuel_type ?? "—",
            quantityGallons: Number(r.quantity_gallons) || 0,
            states: (r.delivery_states ?? []).join(", ") || "—",
            dueDate: formatRfpDate(r.bid_due_date),
          })),
        })
        if (!res.ok) continue
        await markSent("opp-digest", vendorId)
        summary.opportunityDigests += 1
      }
    }
  } catch (err) {
    console.error("[cron] opportunity digest failed", err)
  }

  return NextResponse.json({ ok: true, date: today, ...summary })
}
