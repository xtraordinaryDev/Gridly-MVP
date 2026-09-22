import { Heading, Section, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles } from "./components/email-layout"

export interface InvoicePaymentRecordedProps {
  recipientName: string
  recordedBy: string
  invoiceNumber: string
  amount: string
  method: string
  balance: string
  isPaidInFull: boolean
  invoiceUrl: string
}

export default function InvoicePaymentRecorded({
  recipientName = "there",
  recordedBy = "The other party",
  invoiceNumber = "INV-0001",
  amount = "$0.00",
  method = "ACH",
  balance = "$0.00",
  isPaidInFull = false,
  invoiceUrl = "#",
}: InvoicePaymentRecordedProps) {
  return (
    <EmailLayout
      preview={
        isPaidInFull
          ? `Invoice ${invoiceNumber} paid in full`
          : `Payment of ${amount} recorded on ${invoiceNumber}`
      }
    >
      <Heading style={emailStyles.heading}>
        {isPaidInFull ? `Invoice ${invoiceNumber} is paid` : `Payment recorded on ${invoiceNumber}`}
      </Heading>
      <Text style={emailStyles.paragraph}>Hi {recipientName},</Text>
      <Text style={emailStyles.paragraph}>
        {recordedBy} recorded a payment on invoice <strong>{invoiceNumber}</strong>.
      </Text>
      <Section style={emailStyles.card}>
        <Text style={emailStyles.cardLabel}>Amount</Text>
        <Text style={emailStyles.cardValue}>{amount}</Text>
        <Text style={{ ...emailStyles.cardLabel, marginTop: 10 }}>Method</Text>
        <Text style={emailStyles.cardValue}>{method}</Text>
        <Text style={{ ...emailStyles.cardLabel, marginTop: 10 }}>Remaining balance</Text>
        <Text style={emailStyles.cardValue}>{balance}</Text>
      </Section>
      <EmailButton href={invoiceUrl}>View invoice</EmailButton>
    </EmailLayout>
  )
}
