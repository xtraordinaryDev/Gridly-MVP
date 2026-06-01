import { Heading, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles } from "./components/email-layout"

export interface VendorApprovedCreateAccountProps {
  contactName: string
  companyName: string
  createAccountUrl: string
}

export default function VendorApprovedCreateAccount({
  contactName = "there",
  companyName = "your company",
  createAccountUrl = "https://gridlink.app/vendor/create-account/example",
}: VendorApprovedCreateAccountProps) {
  const name = contactName.trim() || "there"

  return (
    <EmailLayout preview="Congratulations — you're GridLink Verified">
      <Heading style={emailStyles.heading}>Congratulations — you&apos;re GridLink Verified!</Heading>
      <Text style={emailStyles.paragraph}>Hi {name},</Text>
      <Text style={emailStyles.paragraph}>
        Great news: {companyName} has been approved for the GridLink Verified Supplier Network.
      </Text>
      <Text style={emailStyles.paragraph}>
        <strong>GridLink Verified</strong> means your company profile, compliance documents, and
        capabilities have been reviewed by our team. Enterprise fuel buyers can now discover you in
        the Verified Directory and invite you to formal RFPs.
      </Text>
      <Text style={emailStyles.paragraph}>
        Create your vendor portal account to manage your profile, respond to opportunities, and
        submit bids.
      </Text>

      <EmailButton href={createAccountUrl}>Create Your Account</EmailButton>

      <Text style={emailStyles.muted}>
        This link is valid for your organization only. Choose a strong password — you&apos;ll use
        this account to access all GridLink vendor tools.
      </Text>

      <Text style={emailStyles.signOff}>
        Welcome to the network,
        <br />
        <strong>GridLink Vendor Onboarding Team</strong>
      </Text>
    </EmailLayout>
  )
}
