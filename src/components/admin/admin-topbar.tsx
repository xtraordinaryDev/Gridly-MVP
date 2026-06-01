"use client"

import Link from "next/link"
import { ChevronDown, ExternalLink, LogOut, Plus, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

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

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm outline-none transition-colors hover:bg-muted"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-navy text-xs font-semibold text-navy-foreground">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden font-medium text-foreground sm:inline">
              {name}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" />
              <span className="truncate">{name}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/" />}>
              <ExternalLink className="size-4" />
              View site
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/login" />}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
