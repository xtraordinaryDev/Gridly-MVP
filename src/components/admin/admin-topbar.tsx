"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"
import { AdminMobileNav } from "@/components/admin/admin-sidebar"

export function AdminTopbar({
  name,
  preview,
}: {
  name: string
  preview: boolean
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/90 px-3 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <AdminMobileNav />
        <span className="truncate text-sm font-semibold text-navy">
          Grid<span className="text-brand-blue">Link</span> Admin
        </span>
        {preview ? (
          <span className="hidden shrink-0 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 sm:inline">
            Preview mode · sample data
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href="/admin/applications/invite"
          className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          aria-label="Invite supplier"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Invite Supplier</span>
        </Link>

        <UserMenu name={name} companyName="GridLink" />
      </div>
    </header>
  )
}
