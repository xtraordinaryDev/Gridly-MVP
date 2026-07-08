"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"

export function AdminTopbar({
  name,
  preview,
}: {
  name: string
  preview: boolean
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-navy lg:hidden">
          Grid<span className="text-brand-blue">Link</span> Admin
        </span>
        {preview ? (
          <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Preview mode · sample data
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/admin/applications/invite"
          className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
        >
          <Plus className="size-4" />
          Invite Supplier
        </Link>

        <UserMenu name={name} companyName="GridLink" />
      </div>
    </header>
  )
}
