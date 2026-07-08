"use client"

import { UserMenu } from "@/components/user-menu"

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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-navy lg:hidden">
          Grid<span className="text-brand-blue">Link</span>
        </span>
        <span className="hidden text-sm font-semibold text-navy sm:inline">
          {companyName}
        </span>
        {preview ? (
          <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Preview mode
          </span>
        ) : null}
      </div>

      <UserMenu name={name} companyName={companyName} settingsHref="/buyer/settings" />
    </header>
  )
}
