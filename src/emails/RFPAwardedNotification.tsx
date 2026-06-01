import { Heading, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles, siteUrl } from "./components/email-layout"

export interface RFPAwardedNotificationProps {
  vendorName: string
  rfpTitle: string
  buyerName: string
  isWinner: boolean
  opportunityUrl?: string
}

export default function RFPAwardedNotification({
  vendorName = "Supplier",
  rfpTitle = "RFP",
  buyerName = "Buyer",
  isWinner = true,
  opportunityUrl,
}: RFPAwardedNotificationProps) {
  const url = opportunityUrl ?? `${siteUrl()}/vendor/opportunities`

  if (isWinner) {
    return (
      <EmailLayout preview={`Contract awarded — ${rfpTitle}`}>
        <Heading style={emailStyles.heading}>Contract awarded!</Heading>
        <Text style={emailStyles.paragraph}>Hi {vendorName},</Text>
        <Text style={emailStyles.paragraph}>
          Congratulations — {buyerName} has awarded you the contract for{" "}
          <strong>{rfpTitle}</strong> on GridLink.
        </Text>
        <Text style={emailStyles.paragraph}>
          This award is recorded in GridLink as the system of record for this procurement. The
          buyer may follow up directly regarding execution, scheduling, and delivery details.
        </Text>
        <EmailButton href={url}>View in GridLink</EmailButton>
        <Text style={emailStyles.signOff}>
          Well done,
          <br />
          <strong>The GridLink Team</strong>
        </Text>
      </EmailLayout>
    )
  }

  return (
    <EmailLayout preview={`Update on ${rfpTitle}`}>
      <Heading style={emailStyles.heading}>Update on your bid</Heading>
      <Text style={emailStyles.paragraph}>Hi {vendorName},</Text>
      <Text style={emailStyles.paragraph}>
        Thank you for submitting a bid on <strong>{rfpTitle}</strong> from {buyerName}.
      </Text>
      <Text style={emailStyles.paragraph}>
        After review, the buyer has selected another supplier for this contract. We appreciate the
        time and effort your team invested in the response.
      </Text>
      <Text style={emailStyles.paragraph}>
        New opportunities are posted regularly — keep your GridLink profile current so buyers can
        find you for future RFPs.
      </Text>
      <EmailButton href={url}>Browse opportunities</EmailButton>
      <Text style={emailStyles.signOff}>
        Thank you,
        <br />
        <strong>The GridLink Team</strong>
      </Text>
    </EmailLayout>
  )
}
