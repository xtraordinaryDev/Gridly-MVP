import Link from "next/link"
import { LogOut } from "lucide-react"

import { requireVendor } from "@/lib/auth"
import { getCurrentVendor } from "@/lib/data/vendor"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function VendorSettingsPage() {
  const { profile } = await requireVendor()
  const vendor = await getCurrentVendor()
  if (!vendor) return null

  const rows = [
    { label: "Account name", value: profile.fullName ?? "—" },
    { label: "Email", value: vendor.email ?? "—" },
    { label: "Company", value: vendor.companyName },
    { label: "Role", value: "Vendor" },
    {
      label: "Verification",
      value: vendor.isVerified ? "GridLink Verified" : "Pending",
    },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Your account details and access.
        </p>
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-medium text-foreground">
                {row.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <LogOut className="size-4" />
          Sign out
        </Link>
      </div>
    </div>
  )
}
