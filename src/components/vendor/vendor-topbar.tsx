"use client"

import Link from "next/link"
import { ChevronDown, ExternalLink, LogOut, ShieldCheck, UserRound } from "lucide-react"

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

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm outline-none transition-colors hover:bg-muted">
          <Avatar className="size-8">
            <AvatarFallback className="bg-navy text-xs font-semibold text-navy-foreground">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden font-medium text-foreground sm:inline">{name}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="flex items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" />
            <span className="truncate">{name}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/vendor/settings" />}>
            <UserRound className="size-4" />
            Settings
          </DropdownMenuItem>
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
    </header>
  )
}
