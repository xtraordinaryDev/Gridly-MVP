import { Heading, Text } from "@react-email/components"

import { EmailLayout, emailStyles } from "./components/email-layout"

export interface VendorRejectedProps {
  contactName: string
  companyName: string
}

export default function VendorRejected({
  contactName = "there",
  companyName = "your company",
}: VendorRejectedProps) {
  const name = contactName.trim() || "there"

  return (
    <EmailLayout preview="Update on your GridLink application">
      <Heading style={emailStyles.heading}>Update on your application</Heading>
      <Text style={emailStyles.paragraph}>Hi {name},</Text>
      <Text style={emailStyles.paragraph}>
        Thank you for your interest in the GridLink Verified Supplier Network and for the time
        {companyName} invested in your application.
      </Text>
      <Text style={emailStyles.paragraph}>
        After careful review, we&apos;re unable to approve your application for the network at this
        time. This decision reflects our current verification criteria and capacity — not
        necessarily the quality of your operations.
      </Text>
      <Text style={emailStyles.paragraph}>
        If your circumstances change — new coverage, certifications, or compliance documentation —
        you&apos;re welcome to reach out to discuss reapplying in the future.
      </Text>
      <Text style={emailStyles.signOff}>
        Sincerely,
        <br />
        <strong>GridLink Vendor Onboarding Team</strong>
      </Text>
    </EmailLayout>
  )
}
