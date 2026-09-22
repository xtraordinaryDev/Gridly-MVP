import { Heading, Section, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles } from "./components/email-layout"

export interface OrderEventProps {
  recipientName: string
  headline: string
  intro: string
  rows: [string, string][]
  ctaLabel: string
  ctaUrl: string
}

/** Generic order/delivery notification: placed, scheduled, delivered. */
export default function OrderEvent({
  recipientName = "there",
  headline = "Order update",
  intro = "",
  rows = [],
  ctaLabel = "View",
  ctaUrl = "#",
}: OrderEventProps) {
  return (
    <EmailLayout preview={headline}>
      <Heading style={emailStyles.heading}>{headline}</Heading>
      <Text style={emailStyles.paragraph}>Hi {recipientName},</Text>
      <Text style={emailStyles.paragraph}>{intro}</Text>
      <Section style={emailStyles.card}>
        {rows.map(([label, value], i) => (
          <div key={label}>
            <Text style={{ ...emailStyles.cardLabel, marginTop: i === 0 ? 0 : 10 }}>{label}</Text>
            <Text style={emailStyles.cardValue}>{value}</Text>
          </div>
        ))}
      </Section>
      <EmailButton href={ctaUrl}>{ctaLabel}</EmailButton>
    </EmailLayout>
  )
}
