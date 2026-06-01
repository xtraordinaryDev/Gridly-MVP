import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import type { ReactNode } from "react"

const navy = "#0A2540"
const muted = "#6B7280"
const border = "#E5E7EB"

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://gridlink.app"
}

export function EmailLayout({
  preview,
  children,
}: {
  preview: string
  children: ReactNode
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#F9FAFB", margin: 0, fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ margin: "0 auto", padding: "32px 16px", maxWidth: "560px" }}>
          <Section
            style={{
              backgroundColor: navy,
              borderRadius: "12px 12px 0 0",
              padding: "24px 28px",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Grid<span style={{ color: "#3B82F6" }}>Link</span>
            </Text>
            <Text style={{ margin: "6px 0 0", fontSize: "12px", color: "#94A3B8" }}>
              Fuel procurement, verified.
            </Text>
          </Section>

          <Section
            style={{
              backgroundColor: "#ffffff",
              border: `1px solid ${border}`,
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
              padding: "32px 28px",
            }}
          >
            {children}
          </Section>

          <Hr style={{ borderColor: border, margin: "24px 0" }} />
          <Text style={{ margin: 0, fontSize: "12px", color: muted, textAlign: "center" }}>
            © {new Date().getFullYear()} GridLink. All rights reserved.
          </Text>
          <Text style={{ margin: "8px 0 0", fontSize: "11px", color: muted, textAlign: "center" }}>
            You received this message because your organization is connected to GridLink.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const emailStyles = {
  heading: { color: navy, fontSize: "22px", fontWeight: 700, margin: "0 0 16px", lineHeight: 1.3 },
  paragraph: { color: "#374151", fontSize: "15px", lineHeight: 1.6, margin: "0 0 16px" },
  muted: { color: muted, fontSize: "14px", lineHeight: 1.5, margin: "0 0 12px" },
  signOff: { color: "#374151", fontSize: "15px", lineHeight: 1.6, margin: "24px 0 0" },
  list: { color: "#374151", fontSize: "15px", lineHeight: 1.7, margin: "0 0 16px", paddingLeft: "20px" },
  card: {
    backgroundColor: "#F9FAFB",
    border: `1px solid ${border}`,
    borderRadius: "8px",
    padding: "16px 20px",
    margin: "0 0 20px",
  },
  cardLabel: { color: muted, fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.05em", margin: "0 0 4px" },
  cardValue: { color: navy, fontSize: "15px", fontWeight: 600, margin: 0 },
}
