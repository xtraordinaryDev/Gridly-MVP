"use client"

import { UserMenu } from "@/components/user-menu"
import { BuyerMobileNav } from "@/components/buyer/buyer-sidebar"

export function BuyerTopbar({
  companyName,
  name,
  preview,
}: {
  companyName: string
  name: string
  preview: boolean
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/90 px-3 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <BuyerMobileNav />
        <span className="truncate text-sm font-semibold text-navy">{companyName}</span>
        {preview ? (
          <span className="hidden shrink-0 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 sm:inline">
            Preview mode
          </span>
        ) : null}
      </div>

      <UserMenu name={name} companyName={companyName} settingsHref="/buyer/settings" />
    </header>
  )
}
