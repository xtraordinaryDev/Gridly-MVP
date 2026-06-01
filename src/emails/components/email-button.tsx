import { Button } from "@react-email/components"
import type { ReactNode } from "react"

export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: "#3B82F6",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: 600,
        textDecoration: "none",
        borderRadius: "8px",
        padding: "14px 28px",
        display: "inline-block",
        margin: "8px 0 20px",
      }}
    >
      {children}
    </Button>
  )
}
