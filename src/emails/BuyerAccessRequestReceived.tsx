import { Heading, Text } from "@react-email/components"

import { EmailLayout, emailStyles } from "./components/email-layout"

export interface BuyerAccessRequestReceivedProps {
  contactName: string
  companyName: string
}

export default function BuyerAccessRequestReceived({
  contactName = "there",
  companyName = "your organization",
}: BuyerAccessRequestReceivedProps) {
  const name = contactName.trim() || "there"

  return (
    <EmailLayout preview="We've received your GridLink access request">
      <Heading style={emailStyles.heading}>We&apos;ve received your request</Heading>
      <Text style={emailStyles.paragraph}>Hi {name},</Text>
      <Text style={emailStyles.paragraph}>
        Thanks for requesting access to GridLink on behalf of {companyName}. Our team reviews new
        buyer organizations to keep the network trusted on both sides.
      </Text>
      <Text style={emailStyles.paragraph}>
        We typically review requests within <strong>1–2 business days</strong>. Once approved,
        you&apos;ll receive an email with a link to create your account and access the Verified
        Directory.
      </Text>
      <Text style={{ ...emailStyles.paragraph, fontWeight: 600, color: "#0A2540" }}>
        What happens next?
      </Text>
      <Text style={emailStyles.list}>
        • GridLink reviews your organization details
        <br />
        • If approved, you&apos;ll get a secure link to set your password
        <br />
        • You&apos;ll be able to browse verified suppliers and launch RFPs
      </Text>
      <Text style={emailStyles.signOff}>
        Thanks for your interest in GridLink,
        <br />
        <strong>The GridLink Team</strong>
      </Text>
    </EmailLayout>
  )
}
