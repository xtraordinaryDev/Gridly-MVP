import type { Metadata } from "next"

import { requireAdmin } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminTopbar } from "@/components/admin/admin-topbar"

export const metadata: Metadata = {
  title: "Admin — GridLink",
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, preview } = await requireAdmin()

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar name={profile.fullName ?? "Admin"} preview={preview} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
