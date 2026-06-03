import { Heading, Text } from "@react-email/components"

import { EmailLayout, emailStyles } from "./components/email-layout"

export interface BuyerRejectedProps {
  contactName: string
  companyName: string
}

export default function BuyerRejected({
  contactName = "there",
  companyName = "your organization",
}: BuyerRejectedProps) {
  const name = contactName.trim() || "there"

  return (
    <EmailLayout preview="Update on your GridLink access request">
      <Heading style={emailStyles.heading}>Update on your access request</Heading>
      <Text style={emailStyles.paragraph}>Hi {name},</Text>
      <Text style={emailStyles.paragraph}>
        Thank you for your interest in GridLink and for the details you shared about {companyName}.
      </Text>
      <Text style={emailStyles.paragraph}>
        After review, we&apos;re unable to approve access for your organization at this time. This
        reflects our current onboarding criteria and capacity rather than a judgment of your
        operations.
      </Text>
      <Text style={emailStyles.paragraph}>
        If your circumstances change, you&apos;re welcome to reach out to discuss requesting access
        again in the future.
      </Text>
      <Text style={emailStyles.signOff}>
        Sincerely,
        <br />
        <strong>The GridLink Team</strong>
      </Text>
    </EmailLayout>
  )
}
