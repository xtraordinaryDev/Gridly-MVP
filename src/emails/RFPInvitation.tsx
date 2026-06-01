import { Heading, Section, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles } from "./components/email-layout"

export interface RFPInvitationProps {
  vendorName: string
  buyerName: string
  rfpTitle: string
  fuelType: string
  quantityGallons: number
  deliveryStates: string
  bidDueDate: string
  opportunityUrl: string
}

export default function RFPInvitation({
  vendorName = "Supplier",
  buyerName = "A buyer",
  rfpTitle = "Fuel supply opportunity",
  fuelType = "Diesel",
  quantityGallons = 0,
  deliveryStates = "—",
  bidDueDate = "TBD",
  opportunityUrl = "https://gridlink.app/vendor/opportunities",
}: RFPInvitationProps) {
  return (
    <EmailLayout preview={`New opportunity from ${buyerName}`}>
      <Heading style={emailStyles.heading}>New opportunity from {buyerName}</Heading>
      <Text style={emailStyles.paragraph}>Hi {vendorName},</Text>
      <Text style={emailStyles.paragraph}>
        {buyerName} has invited you to submit a bid on the following GridLink RFP. Your company
        profile matched their requirements — we&apos;d love to see your response.
      </Text>

      <Section style={emailStyles.card}>
        <Text style={emailStyles.cardLabel}>RFP</Text>
        <Text style={{ ...emailStyles.cardValue, fontSize: "17px", marginBottom: 12 }}>
          {rfpTitle}
        </Text>
        <Text style={emailStyles.cardLabel}>Fuel · Quantity</Text>
        <Text style={{ ...emailStyles.paragraph, margin: "0 0 8px" }}>
          {fuelType} · {quantityGallons.toLocaleString()} gallons
        </Text>
        <Text style={emailStyles.cardLabel}>Delivery states</Text>
        <Text style={{ ...emailStyles.paragraph, margin: "0 0 8px" }}>{deliveryStates}</Text>
        <Text style={emailStyles.cardLabel}>Bids due</Text>
        <Text
          style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: 700,
            color: "#3B82F6",
          }}
        >
          {bidDueDate}
        </Text>
      </Section>

      <EmailButton href={opportunityUrl}>View RFP</EmailButton>

      <Text style={emailStyles.signOff}>
        Good luck with your bid,
        <br />
        <strong>The GridLink Team</strong>
      </Text>
    </EmailLayout>
  )
}
