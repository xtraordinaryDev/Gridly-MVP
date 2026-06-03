import "server-only"

import { format } from "date-fns"

import { sendEmail, siteUrl } from "@/lib/email"

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
  const dueLabel = format(new Date(params.bidDueDate), "MMMM d, yyyy")
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
}) {
  // Buyer notification — plain Resend for MVP (no dedicated template in Phase 7 spec).
  if (!process.env.RESEND_API_KEY) {
    console.info(
      `[GridLink email] New bid → ${params.buyerEmail}: ${params.vendorName} on "${params.rfpTitle}"`
    )
    return
  }

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL?.trim() ?? "GridLink <onboarding@resend.dev>",
    to: params.buyerEmail,
    subject: `New bid on ${params.rfpTitle}`,
    text: `${params.vendorName} submitted a bid on "${params.rfpTitle}". Sign in to GridLink to review responses.`,
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
