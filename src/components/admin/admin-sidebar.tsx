"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  FileStack,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Applications", href: "/admin/applications", icon: FileStack },
  { label: "Verified Vendors", href: "/admin/vendors", icon: ShieldCheck },
  { label: "Buyers", href: "/admin/buyers", icon: Building2 },
  { label: "RFPs", href: "/admin/rfps", icon: Truck },
  { label: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-navy text-navy-foreground lg:flex">
      <Link
        href="/admin"
        className="flex h-16 items-center gap-2 border-b border-white/10 px-5"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
          <Zap className="size-4 fill-brand-blue text-brand-blue" />
        </span>
        <span className="text-base font-bold tracking-tight">
          Grid<span className="text-brand-blue">Link</span>
        </span>
        <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
          Admin
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-blue text-brand-blue-foreground"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4 text-xs text-white/40">
        GridLink Operations Console
      </div>
    </aside>
  )
}
