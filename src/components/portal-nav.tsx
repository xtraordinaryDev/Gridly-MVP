"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export interface PortalNavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Match only the exact path (for index routes like /admin). */
  exact?: boolean
}

function isActive(pathname: string, item: PortalNavItem) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/** The link list shared by the desktop sidebar and the mobile sheet. */
export function PortalNavLinks({ items, onNavigate }: { items: PortalNavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const active = isActive(pathname, item)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-blue text-brand-blue-foreground" : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Desktop sidebar: hidden below lg, where PortalMobileNav takes over. */
export function PortalSidebar({
  items,
  brand,
  footer,
  width = "w-60",
}: {
  items: PortalNavItem[]
  brand: React.ReactNode
  footer: string
  width?: string
}) {
  return (
    <aside className={cn("hidden shrink-0 flex-col border-r border-white/10 bg-navy text-navy-foreground lg:flex", width)}>
      {brand}
      <PortalNavLinks items={items} />
      <div className="border-t border-white/10 p-4 text-xs text-white/40">{footer}</div>
    </aside>
  )
}

/**
 * Hamburger + slide-in drawer for phones and tablets. Rendered in the topbar;
 * closes itself after navigation.
 */
export function PortalMobileNav({
  items,
  brand,
  footer,
  label = "Open navigation",
}: {
  items: PortalNavItem[]
  brand: React.ReactNode
  footer: string
  label?: string
}) {
  // Links close the sheet via onNavigate, so no pathname effect is needed.
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex size-10 items-center justify-center rounded-lg text-navy transition-colors hover:bg-muted lg:hidden"
        aria-label={label}
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[min(18rem,85vw)] gap-0 border-white/10 bg-navy p-0 text-navy-foreground sm:max-w-none"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Portal sections</SheetDescription>
        {brand}
        <div className="flex-1 overflow-y-auto">
          <PortalNavLinks items={items} onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t border-white/10 p-4 text-xs text-white/40">{footer}</div>
      </SheetContent>
    </Sheet>
  )
}
