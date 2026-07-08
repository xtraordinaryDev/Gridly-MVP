"use client"

import { ShieldCheck } from "lucide-react"

import { UserMenu } from "@/components/user-menu"

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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-navy">{companyName}</span>
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-xs font-medium text-emerald">
            <ShieldCheck className="size-3" />
            Verified
          </span>
        ) : null}
        {preview ? (
          <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Preview mode
          </span>
        ) : null}
      </div>

      <UserMenu name={name} companyName={companyName} settingsHref="/vendor/settings" />
    </header>
  )
}
