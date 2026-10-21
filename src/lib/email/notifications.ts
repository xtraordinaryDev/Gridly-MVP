import "server-only"

import { isEmailConfigured, sendEmail, siteUrl } from "@/lib/email"
import { formatRfpDate } from "@/lib/rfp/dates"

export async function sendRfpInvitationEmails(params: {
  rfpId: string
  rfpTitle: string
  fuelType: string
  quantityGallons: number
  deliveryStates: string[]
  bidDueDate: string
  buyerName: string
  vendorEmails: {
    vendorId: string
    companyName: string
    email: string
  }[]
}) {
  const base = siteUrl()
  const dueLabel = formatRfpDate(params.bidDueDate)
  const states = params.deliveryStates.join(", ") || "—"

  await Promise.all(
    params.vendorEmails.map((v) =>
      sendEmail({
        to: v.email,
        template: "rfp-invitation",
        data: {
          vendorName: v.companyName,
          buyerName: params.buyerName,
          rfpTitle: params.rfpTitle,
          fuelType: params.fuelType,
          quantityGallons: params.quantityGallons,
          deliveryStates: states,
          bidDueDate: dueLabel,
          opportunityUrl: `${base}/vendor/opportunities/${params.rfpId}`,
        },
      })
    )
  )
}

export async function sendNewRfpNotification(params: {
  rfpId: string
  rfpTitle: string
  buyerName: string
  fuelType: string
  quantityGallons: number
  deliveryStates: string[]
  status: "draft" | "published"
}) {
  // Internal "ops" notification — sent to the GridLink operator address.
  const to = process.env.GRIDLINK_NOTIFY_EMAIL?.trim()
  if (!to) return // no recipient configured; skip silently

  const base = siteUrl()
  const states = params.deliveryStates.join(", ") || "—"
  const summary = [
    `${params.buyerName} created a new RFP on GridLink.`,
    "",
    `Title:     ${params.rfpTitle}`,
    `Fuel:      ${params.fuelType}`,
    `Quantity:  ${params.quantityGallons.toLocaleString()} gal`,
    `States:    ${states}`,
    `Status:    ${params.status}`,
    "",
    `View it: ${base}/buyer/rfps/${params.rfpId}`,
  ].join("\n")

  if (!process.env.RESEND_API_KEY) {
    console.info(`[GridLink email] New RFP → ${to}\n${summary}`)
    return
  }

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL?.trim() ?? "GridLink <onboarding@resend.dev>",
    to,
    subject: `New RFP: ${params.rfpTitle} — ${params.buyerName}`,
    text: summary,
  })
}

export async function sendBidSubmittedEmail(params: {
  buyerEmail: string
  rfpTitle: string
  vendorName: string
  /** The supplier revised a bid they had already submitted. */
  updated?: boolean
  /** The supplier pulled their bid. */
  withdrawn?: boolean
}) {
  const verb = params.withdrawn ? "withdrew their bid" : params.updated ? "updated their bid" : "submitted a bid"
  const label = params.withdrawn ? "Bid withdrawn" : params.updated ? "Bid updated" : "New bid"
  // Buyer notification — plain Resend for MVP (no dedicated template in Phase 7 spec).
  if (!process.env.RESEND_API_KEY) {
    console.info(
      `[GridLink email] ${label} → ${params.buyerEmail}: ${params.vendorName} on "${params.rfpTitle}"`
    )
    return
  }

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL?.trim() ?? "GridLink <onboarding@resend.dev>",
    to: params.buyerEmail,
    subject: `${label} on ${params.rfpTitle}`,
    text: `${params.vendorName} ${verb} on "${params.rfpTitle}". Sign in to GridLink to review responses.`,
  })
}

export async function sendRfpAwardedEmails(params: {
  rfpTitle: string
  buyerName: string
  awarded: { email: string; companyName: string }
  notAwarded: { email: string; companyName: string }[]
}) {
  await sendEmail({
    to: params.awarded.email,
    template: "rfp-awarded",
    data: {
      vendorName: params.awarded.companyName,
      rfpTitle: params.rfpTitle,
      buyerName: params.buyerName,
      isWinner: true,
    },
  })

  await Promise.all(
    params.notAwarded.map((v) =>
      sendEmail({
        to: v.email,
        template: "rfp-awarded",
        data: {
          vendorName: v.companyName,
          rfpTitle: params.rfpTitle,
          buyerName: params.buyerName,
          isWinner: false,
        },
      })
    )
  )
}

export async function sendDailyOpportunityDigest(params: {
  vendorEmail: string
  vendorName: string
  dateLabel: string
  opportunities: {
    id: string
    title: string
    buyer: string
    fuelType: string
    quantityGallons: number
    states: string
    dueDate: string
  }[]
}) {
  return sendEmail({
    to: params.vendorEmail,
    template: "daily-opportunity-digest",
    data: {
      vendorName: params.vendorName,
      dateLabel: params.dateLabel,
      opportunities: params.opportunities,
    },
  })
}

/**
 * Ops notification: a vendor asked for a locked (verification-tied) profile
 * field to be changed. Plain text to the GridLink operator address.
 */
export async function sendProfileChangeRequestEmail(params: {
  vendorId: string
  companyName: string
  requestedBy: string | null
  requesterEmail: string | null
  field: string
  message: string
}): Promise<{ status: "sent" | "preview" | "no-recipient" | "failed" }> {
  const to = process.env.GRIDLINK_NOTIFY_EMAIL?.trim()
  if (!to) return { status: "no-recipient" }

  const subject = `Profile change request: ${params.companyName} — ${params.field}`
  const text = [
    `${params.companyName} asked for a locked profile field to be changed.`,
    "",
    `Field:        ${params.field}`,
    `Requested by: ${params.requestedBy ?? "—"}${params.requesterEmail ? ` <${params.requesterEmail}>` : ""}`,
    `Vendor ID:    ${params.vendorId}`,
    "",
    "Request:",
    params.message,
    "",
    `Admin: ${siteUrl()}/admin`,
  ].join("\n")

  if (!isEmailConfigured()) {
    console.info(`[GridLink email preview] ${JSON.stringify({ to: [to], subject, template: "profile-change-request" })}`)
    return { status: "preview" }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL?.trim() ?? "GridLink <onboarding@resend.dev>",
      to,
      subject,
      text,
      ...(params.requesterEmail ? { replyTo: params.requesterEmail } : {}),
    })
    if (error) {
      console.error("[GridLink email]", error)
      return { status: "failed" }
    }
    return { status: "sent" }
  } catch (err) {
    console.error("[GridLink email]", err)
    return { status: "failed" }
  }
}

/**
 * Internal alert when a buyer or supplier submits a sign-up application.
 * Goes to the shared ops inbox (GRIDLINK_NOTIFY_EMAIL) with a reply-to set
 * to the applicant, so the team can answer straight from the inbox.
 */
export async function sendNewApplicationAlert(params: {
  kind: "buyer" | "supplier"
  companyName: string
  contactName: string
  email: string
  phone?: string
  details: [label: string, value: string | null | undefined][]
}): Promise<{ status: "sent" | "preview" | "no-recipient" | "failed" }> {
  const to = process.env.GRIDLINK_NOTIFY_EMAIL?.trim()
  if (!to) return { status: "no-recipient" }

  const label = params.kind === "buyer" ? "New buyer request" : "New supplier application"
  const adminPath = params.kind === "buyer" ? "/admin/buyers" : "/admin/applications"
  const subject = `${label}: ${params.companyName}`
  const width = Math.max(...params.details.map(([k]) => k.length), 7) + 1
  const text = [
    `${params.contactName} at ${params.companyName} ${params.kind === "buyer" ? "requested buyer access" : "applied to become a supplier"} on GridLink.`,
    "",
    `${"Contact".padEnd(width)} ${params.contactName} <${params.email}>${params.phone ? ` · ${params.phone}` : ""}`,
    ...params.details
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `${k.padEnd(width)} ${String(v).trim()}`),
    "",
    `Review it: ${siteUrl()}${adminPath}`,
  ].join("\n")

  if (!isEmailConfigured()) {
    console.info(`[GridLink email preview] ${JSON.stringify({ to: [to], subject, template: "new-application-alert" })}`)
    return { status: "preview" }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL?.trim() ?? "GridLink <onboarding@resend.dev>",
      to,
      subject,
      text,
      replyTo: params.email,
    })
    if (error) {
      console.error("sendNewApplicationAlert error:", error.message)
      return { status: "failed" }
    }
    return { status: "sent" }
  } catch (err) {
    console.error("sendNewApplicationAlert error:", err)
    return { status: "failed" }
  }
}
