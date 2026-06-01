import { Heading, Section, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles } from "./components/email-layout"

export interface VendorOnboardingInviteProps {
  contactName: string
  companyName: string
  registrationUrl: string
}

export default function VendorOnboardingInvite({
  contactName = "there",
  companyName = "your company",
  registrationUrl = "https://gridlink.app/vendor-registration/example",
}: VendorOnboardingInviteProps) {
  const name = contactName.trim() || "there"

  return (
    <EmailLayout preview="Welcome to GridLink — begin your supplier verification">
      <Heading style={emailStyles.heading}>Welcome to GridLink!</Heading>
      <Text style={emailStyles.paragraph}>
        Hi {name},
      </Text>
      <Text style={emailStyles.paragraph}>
        {companyName} has been invited to join the GridLink Verified Supplier Network — the
        procurement platform enterprise fuel buyers use to discover, qualify, and contract with
        trusted fuel suppliers nationwide.
      </Text>

      <Section style={{ margin: "0 0 20px" }}>
        <Text style={{ ...emailStyles.paragraph, fontWeight: 600, color: "#0A2540", marginBottom: 8 }}>
          What is GridLink?
        </Text>
        <Text style={emailStyles.paragraph}>
          GridLink is the procurement operating system for fuel — a centralized system of record
          that replaces email and spreadsheets with verified supplier profiles, structured RFPs,
          and audit-ready contracting.
        </Text>
      </Section>

      <Text style={{ ...emailStyles.paragraph, fontWeight: 600, color: "#0A2540" }}>
        Next steps
      </Text>
      <Text style={emailStyles.list}>
        1. Complete your vendor registration profile
        <br />
        2. Upload required compliance documents
        <br />
        3. Submit for GridLink admin review
        <br />
        4. Once verified, create your portal account and start receiving opportunities
      </Text>

      <Text style={{ ...emailStyles.paragraph, fontWeight: 600, color: "#0A2540" }}>
        Required documents
      </Text>
      <Text style={emailStyles.list}>
        • W-9 form
        <br />
        • Certificate of insurance (COI)
        <br />
        • Distributor license (if applicable)
        <br />
        • Company logo (optional)
      </Text>

      <EmailButton href={registrationUrl}>Complete Vendor Registration</EmailButton>

      <Text style={emailStyles.muted}>
        This secure link is unique to {companyName}. If you weren&apos;t expecting this invitation,
        you can disregard this email.
      </Text>

      <Text style={emailStyles.signOff}>
        Warm regards,
        <br />
        <strong>GridLink Vendor Onboarding Team</strong>
      </Text>
    </EmailLayout>
  )
}
