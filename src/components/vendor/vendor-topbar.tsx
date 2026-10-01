"use client"

import { ShieldCheck } from "lucide-react"

import { UserMenu } from "@/components/user-menu"
import { VendorMobileNav } from "@/components/vendor/vendor-sidebar"

export function VendorTopbar({
  companyName,
  name,
  verified,
  preview,
}: {
  companyName: string
  name: string
  verified: boolean
  preview: boolean
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/90 px-3 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <VendorMobileNav />
        <span className="truncate text-sm font-semibold text-navy">{companyName}</span>
        {verified ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-xs font-medium text-emerald">
            <ShieldCheck className="size-3" />
            <span className="hidden sm:inline">Verified</span>
          </span>
        ) : null}
        {preview ? (
          <span className="hidden shrink-0 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 sm:inline">
            Preview mode
          </span>
        ) : null}
      </div>

      <UserMenu name={name} companyName={companyName} settingsHref="/vendor/settings" />
    </header>
  )
}
