import { Heading, Link, Section, Text } from "@react-email/components"

import { EmailButton } from "./components/email-button"
import { EmailLayout, emailStyles, siteUrl } from "./components/email-layout"

export interface DigestOpportunityRow {
  id: string
  title: string
  buyer: string
  fuelType: string
  quantityGallons: number
  states: string
  dueDate: string
}

export interface DailyOpportunityDigestProps {
  vendorName: string
  dateLabel: string
  opportunities: DigestOpportunityRow[]
}

export default function DailyOpportunityDigest({
  vendorName = "Supplier",
  dateLabel = "Today",
  opportunities = [],
}: DailyOpportunityDigestProps) {
  const base = siteUrl()

  return (
    <EmailLayout preview={`Your GridLink opportunities — ${dateLabel}`}>
      <Heading style={emailStyles.heading}>Your GridLink opportunities</Heading>
      <Text style={emailStyles.paragraph}>Hi {vendorName},</Text>
      <Text style={emailStyles.paragraph}>
        Here are open RFPs matching your notification preferences for{" "}
        <strong>{dateLabel}</strong>.
      </Text>

      {opportunities.length === 0 ? (
        <Text style={emailStyles.muted}>No new matching opportunities today.</Text>
      ) : (
        <Section style={{ margin: "0 0 20px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#0A2540", color: "#ffffff" }}>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Opportunity</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Buyer</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Due</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o, i) => (
                <tr
                  key={o.id}
                  style={{
                    backgroundColor: i % 2 === 0 ? "#ffffff" : "#F9FAFB",
                    borderBottom: "1px solid #E5E7EB",
                  }}
                >
                  <td style={{ padding: "12px" }}>
                    <Link
                      href={`${base}/vendor/opportunities/${o.id}`}
                      style={{ color: "#3B82F6", fontWeight: 600, textDecoration: "none" }}
                    >
                      {o.title}
                    </Link>
                    <Text style={{ margin: "4px 0 0", fontSize: "12px", color: "#6B7280" }}>
                      {o.fuelType} · {o.quantityGallons.toLocaleString()} gal · {o.states}
                    </Text>
                  </td>
                  <td style={{ padding: "12px", color: "#374151" }}>{o.buyer}</td>
                  <td style={{ padding: "12px", color: "#374151", whiteSpace: "nowrap" }}>
                    {o.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <EmailButton href={`${base}/vendor/opportunities`}>View all opportunities</EmailButton>

      <Text style={emailStyles.muted}>
        Update your fuel types, states, and frequency in Notification Preferences.
      </Text>

      <Text style={emailStyles.signOff}>
        — The GridLink Team
      </Text>
    </EmailLayout>
  )
}
