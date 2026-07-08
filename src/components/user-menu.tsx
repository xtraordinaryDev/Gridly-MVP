"use client"

import Link from "next/link"
import { ChevronDown, ExternalLink, LogOut, Settings, UserRound } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

export function UserMenu({
  name,
  companyName,
  settingsHref,
}: {
  name: string
  companyName?: string
  settingsHref?: string
}) {
  return (
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {name}
              </span>
              {companyName ? (
                <span className="block truncate font-normal">{companyName}</span>
              ) : null}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {settingsHref ? (
            <DropdownMenuItem render={<Link href={settingsHref} />}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem render={<Link href="/" />}>
            <ExternalLink className="size-4" />
            View site
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Plain anchor: full navigation through /logout clears the session
              server-side before landing on /login. */}
          <DropdownMenuItem render={<a href="/logout" />}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
