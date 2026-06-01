import { Heading, Text } from "@react-email/components"

import { EmailLayout, emailStyles } from "./components/email-layout"

export interface VendorApplicationReceivedProps {
  contactName: string
  companyName: string
}

export default function VendorApplicationReceived({
  contactName = "there",
  companyName = "your company",
}: VendorApplicationReceivedProps) {
  const name = contactName.trim() || "there"

  return (
    <EmailLayout preview="We've received your GridLink application">
      <Heading style={emailStyles.heading}>We&apos;ve received your application</Heading>
      <Text style={emailStyles.paragraph}>Hi {name},</Text>
      <Text style={emailStyles.paragraph}>
        Thank you for submitting {companyName}&apos;s application to the GridLink Verified Supplier
        Network. We&apos;ve received your profile and compliance documents.
      </Text>
      <Text style={emailStyles.paragraph}>
        Our team typically completes initial review within <strong>1–2 weeks</strong>. You&apos;ll
        receive an email when a decision is ready or if we need additional information.
      </Text>
      <Text style={{ ...emailStyles.paragraph, fontWeight: 600, color: "#0A2540" }}>
        What happens next?
      </Text>
      <Text style={emailStyles.list}>
        • GridLink reviews your company information, capabilities, and documents
        <br />
        • If approved, you&apos;ll receive a link to create your vendor portal account
        <br />
        • Verified suppliers appear in the GridLink Directory for enterprise buyers
      </Text>
      <Text style={emailStyles.signOff}>
        Thank you for your interest in GridLink,
        <br />
        <strong>GridLink Vendor Onboarding Team</strong>
      </Text>
    </EmailLayout>
  )
}
