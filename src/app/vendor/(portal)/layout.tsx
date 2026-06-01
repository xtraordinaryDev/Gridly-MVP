import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { requireVendor } from "@/lib/auth"
import { getCurrentVendor } from "@/lib/data/vendor"
import { VendorSidebar } from "@/components/vendor/vendor-sidebar"
import { VendorTopbar } from "@/components/vendor/vendor-topbar"

export const metadata: Metadata = {
  title: "Vendor Portal — GridLink",
  robots: { index: false, follow: false },
}

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, preview } = await requireVendor()
  const vendor = await getCurrentVendor()

  if (!vendor) {
    // Authenticated but no linked vendor record — send to sign-in.
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <VendorSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <VendorTopbar
          companyName={vendor.companyName}
          name={profile.fullName ?? "Vendor"}
          verified={vendor.isVerified}
          preview={preview}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
