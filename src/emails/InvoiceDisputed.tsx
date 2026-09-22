import { Heading, Section, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles } from "./components/email-layout"

export interface InvoiceDisputedProps {
  vendorName: string
  buyerName: string
  invoiceNumber: string
  reason: string
  invoiceUrl: string
}

export default function InvoiceDisputed({
  vendorName = "Supplier",
  buyerName = "Buyer",
  invoiceNumber = "INV-0001",
  reason = "",
  invoiceUrl = "#",
}: InvoiceDisputedProps) {
  return (
    <EmailLayout preview={`${buyerName} disputed invoice ${invoiceNumber}`}>
      <Heading style={emailStyles.heading}>Invoice {invoiceNumber} was disputed</Heading>
      <Text style={emailStyles.paragraph}>Hi {vendorName},</Text>
      <Text style={emailStyles.paragraph}>
        {buyerName} raised a dispute on invoice <strong>{invoiceNumber}</strong>. Payment is paused
        until you resolve it.
      </Text>
      <Section style={emailStyles.card}>
        <Text style={emailStyles.cardLabel}>Their note</Text>
        <Text style={emailStyles.cardValue}>{reason}</Text>
      </Section>
      <EmailButton href={invoiceUrl}>Review and resolve</EmailButton>
    </EmailLayout>
  )
}
