import type { Metadata } from "next"

import { requireBuyer } from "@/lib/auth"
import { BuyerSidebar } from "@/components/buyer/buyer-sidebar"
import { BuyerTopbar } from "@/components/buyer/buyer-topbar"

export const metadata: Metadata = {
  title: "Buyer Portal — GridLink",
  robots: { index: false, follow: false },
}

export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, preview } = await requireBuyer()

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <BuyerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <BuyerTopbar
          companyName={profile.companyName ?? "Organization"}
          name={profile.fullName ?? "Buyer"}
          preview={preview}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
