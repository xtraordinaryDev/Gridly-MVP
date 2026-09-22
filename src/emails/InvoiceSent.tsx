import { Heading, Section, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles } from "./components/email-layout"

export interface InvoiceSentProps {
  buyerName: string
  vendorName: string
  invoiceNumber: string
  contractTitle: string
  total: string
  dueDate: string
  viewUrl: string
}

export default function InvoiceSent({
  buyerName = "there",
  vendorName = "Supplier",
  invoiceNumber = "INV-0001",
  contractTitle = "Contract",
  total = "$0.00",
  dueDate = "—",
  viewUrl = "#",
}: InvoiceSentProps) {
  return (
    <EmailLayout preview={`Invoice ${invoiceNumber} from ${vendorName} — ${total} due ${dueDate}`}>
      <Heading style={emailStyles.heading}>New invoice from {vendorName}</Heading>
      <Text style={emailStyles.paragraph}>Hi {buyerName},</Text>
      <Text style={emailStyles.paragraph}>
        {vendorName} sent you an invoice through GridLink for <strong>{contractTitle}</strong>.
      </Text>
      <Section style={emailStyles.card}>
        <Text style={emailStyles.cardLabel}>Invoice</Text>
        <Text style={emailStyles.cardValue}>{invoiceNumber}</Text>
        <Text style={{ ...emailStyles.cardLabel, marginTop: 10 }}>Amount due</Text>
        <Text style={emailStyles.cardValue}>{total}</Text>
        <Text style={{ ...emailStyles.cardLabel, marginTop: 10 }}>Due date</Text>
        <Text style={emailStyles.cardValue}>{dueDate}</Text>
      </Section>
      <EmailButton href={viewUrl}>View invoice</EmailButton>
      <Text style={emailStyles.muted}>
        This link opens the invoice and PDF without signing in. Questions about a charge? Open the
        invoice and choose “Dispute” to send a note to {vendorName}.
      </Text>
    </EmailLayout>
  )
}
