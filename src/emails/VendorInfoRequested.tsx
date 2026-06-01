import { Heading, Section, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles } from "./components/email-layout"

export interface VendorInfoRequestedProps {
  contactName: string
  companyName: string
  adminMessage: string
  registrationUrl: string
}

export default function VendorInfoRequested({
  contactName = "there",
  companyName = "your company",
  adminMessage = "Please update the documents listed in your application.",
  registrationUrl = "https://gridlink.app/vendor-registration/example",
}: VendorInfoRequestedProps) {
  const name = contactName.trim() || "there"

  return (
    <EmailLayout preview="Action required: GridLink application">
      <Heading style={emailStyles.heading}>Action required on your application</Heading>
      <Text style={emailStyles.paragraph}>Hi {name},</Text>
      <Text style={emailStyles.paragraph}>
        Our team is reviewing {companyName}&apos;s GridLink application and needs a bit more
        information before we can continue.
      </Text>

      <Section style={emailStyles.card}>
        <Text style={emailStyles.cardLabel}>Message from GridLink</Text>
        <Text style={{ ...emailStyles.paragraph, margin: 0, whiteSpace: "pre-wrap" }}>
          {adminMessage}
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        Please return to your application to upload or update the requested items.
      </Text>

      <EmailButton href={registrationUrl}>Update My Application</EmailButton>

      <Text style={emailStyles.signOff}>
        Thank you,
        <br />
        <strong>GridLink Vendor Onboarding Team</strong>
      </Text>
    </EmailLayout>
  )
}
