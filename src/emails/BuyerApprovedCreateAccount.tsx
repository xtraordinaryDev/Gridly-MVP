import { Heading, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles } from "./components/email-layout"

export interface BuyerApprovedCreateAccountProps {
  contactName: string
  companyName: string
  createAccountUrl: string
}

export default function BuyerApprovedCreateAccount({
  contactName = "there",
  companyName = "your organization",
  createAccountUrl = "https://gridlink.app/buyer/create-account/example",
}: BuyerApprovedCreateAccountProps) {
  const name = contactName.trim() || "there"

  return (
    <EmailLayout preview="Your GridLink buyer account is approved">
      <Heading style={emailStyles.heading}>You&apos;re approved — welcome to GridLink</Heading>
      <Text style={emailStyles.paragraph}>Hi {name},</Text>
      <Text style={emailStyles.paragraph}>
        Good news: {companyName} has been approved for GridLink. You can now create your account to
        access the procurement platform.
      </Text>
      <Text style={emailStyles.paragraph}>
        With GridLink you can browse the Verified Supplier Directory, launch sourcing events (RFPs),
        compare qualified bids side-by-side, and award contracts — all in one system of record.
      </Text>

      <EmailButton href={createAccountUrl}>Create Your Account</EmailButton>

      <Text style={emailStyles.muted}>
        This link is for your organization only. Choose a strong password — you&apos;ll use this
        account to access all GridLink buyer tools.
      </Text>

      <Text style={emailStyles.signOff}>
        Welcome aboard,
        <br />
        <strong>The GridLink Team</strong>
      </Text>
    </EmailLayout>
  )
}
