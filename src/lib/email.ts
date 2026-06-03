import "server-only"

import { createElement, type ReactElement } from "react"
import { Resend } from "resend"

import {
  BuyerAccessRequestReceived,
  BuyerApprovedCreateAccount,
  BuyerRejected,
  DailyOpportunityDigest,
  RFPInvitation,
  RFPAwardedNotification,
  VendorApplicationReceived,
  VendorApprovedCreateAccount,
  VendorInfoRequested,
  VendorOnboardingInvite,
  VendorRejected,
} from "@/emails"
import type { BuyerAccessRequestReceivedProps } from "@/emails/BuyerAccessRequestReceived"
import type { BuyerApprovedCreateAccountProps } from "@/emails/BuyerApprovedCreateAccount"
import type { BuyerRejectedProps } from "@/emails/BuyerRejected"
import type { DailyOpportunityDigestProps } from "@/emails/DailyOpportunityDigest"
import type { RFPInvitationProps } from "@/emails/RFPInvitation"
import type { RFPAwardedNotificationProps } from "@/emails/RFPAwardedNotification"
import type { VendorApplicationReceivedProps } from "@/emails/VendorApplicationReceived"
import type { VendorApprovedCreateAccountProps } from "@/emails/VendorApprovedCreateAccount"
import type { VendorInfoRequestedProps } from "@/emails/VendorInfoRequested"
import type { VendorOnboardingInviteProps } from "@/emails/VendorOnboardingInvite"
import type { VendorRejectedProps } from "@/emails/VendorRejected"
import { siteUrl } from "@/emails/components/email-layout"

export { siteUrl }

export type EmailTemplate =
  | { template: "vendor-onboarding-invite"; data: VendorOnboardingInviteProps }
  | { template: "vendor-application-received"; data: VendorApplicationReceivedProps }
  | { template: "vendor-approved-create-account"; data: VendorApprovedCreateAccountProps }
  | { template: "vendor-info-requested"; data: VendorInfoRequestedProps }
  | { template: "vendor-rejected"; data: VendorRejectedProps }
  | { template: "buyer-access-request-received"; data: BuyerAccessRequestReceivedProps }
  | { template: "buyer-approved-create-account"; data: BuyerApprovedCreateAccountProps }
  | { template: "buyer-rejected"; data: BuyerRejectedProps }
  | { template: "rfp-invitation"; data: RFPInvitationProps }
  | { template: "daily-opportunity-digest"; data: DailyOpportunityDigestProps }
  | { template: "rfp-awarded"; data: RFPAwardedNotificationProps }

type SendEmailInput = {
  to: string | string[]
  subject?: string
} & EmailTemplate

function subjectFor(payload: EmailTemplate): string {
  switch (payload.template) {
    case "vendor-onboarding-invite":
      return "Welcome to GridLink — Begin Your Verification"
    case "vendor-application-received":
      return "We've received your GridLink application"
    case "vendor-approved-create-account":
      return "Congratulations — You're GridLink Verified"
    case "vendor-info-requested":
      return "Action Required: GridLink Application"
    case "vendor-rejected":
      return "Update on your GridLink application"
    case "buyer-access-request-received":
      return "We've received your GridLink access request"
    case "buyer-approved-create-account":
      return "You're approved — welcome to GridLink"
    case "buyer-rejected":
      return "Update on your GridLink access request"
    case "rfp-invitation":
      return `New Opportunity from ${payload.data.buyerName} — ${payload.data.rfpTitle}`
    case "daily-opportunity-digest":
      return `Your GridLink Opportunities — ${payload.data.dateLabel}`
    case "rfp-awarded":
      return payload.data.isWinner
        ? `Contract awarded — ${payload.data.rfpTitle}`
        : `Update on your bid — ${payload.data.rfpTitle}`
  }
}

function renderTemplate(payload: EmailTemplate): ReactElement {
  switch (payload.template) {
    case "vendor-onboarding-invite":
      return createElement(VendorOnboardingInvite, payload.data)
    case "vendor-application-received":
      return createElement(VendorApplicationReceived, payload.data)
    case "vendor-approved-create-account":
      return createElement(VendorApprovedCreateAccount, payload.data)
    case "vendor-info-requested":
      return createElement(VendorInfoRequested, payload.data)
    case "vendor-rejected":
      return createElement(VendorRejected, payload.data)
    case "buyer-access-request-received":
      return createElement(BuyerAccessRequestReceived, payload.data)
    case "buyer-approved-create-account":
      return createElement(BuyerApprovedCreateAccount, payload.data)
    case "buyer-rejected":
      return createElement(BuyerRejected, payload.data)
    case "rfp-invitation":
      return createElement(RFPInvitation, payload.data)
    case "daily-opportunity-digest":
      return createElement(DailyOpportunityDigest, payload.data)
    case "rfp-awarded":
      return createElement(RFPAwardedNotification, payload.data)
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

function fromAddress() {
  return process.env.RESEND_FROM_EMAIL?.trim() ?? "GridLink <onboarding@resend.dev>"
}

export type SendEmailResult =
  | { ok: true; id?: string; preview?: boolean }
  | { ok: false; message: string }

/**
 * Send a branded GridLink email via Resend + React Email.
 * Without RESEND_API_KEY, logs the intended send (preview / local dev).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = Array.isArray(input.to) ? input.to : [input.to]
  const subject = input.subject ?? subjectFor(input)
  const react = renderTemplate(input)

  if (!isEmailConfigured()) {
    console.info("[GridLink email preview]", { to, subject, template: input.template })
    return { ok: true, preview: true }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject,
      react,
    })

    if (error) {
      console.error("[GridLink email]", error)
      return { ok: false, message: error.message }
    }

    return { ok: true, id: data?.id }
  } catch (err) {
    console.error("[GridLink email]", err)
    return { ok: false, message: "Failed to send email." }
  }
}
