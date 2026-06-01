"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  FileText,
  LayoutDashboard,
  Send,
  Settings,
  ShieldCheck,
  Truck,
  Building2,
} from "lucide-react"

import { cn } from "@/lib/utils"

const NAV = [
  { label: "Dashboard", href: "/vendor/dashboard", icon: LayoutDashboard },
  { label: "Company Profile", href: "/vendor/profile", icon: Building2 },
  { label: "Documents", href: "/vendor/documents", icon: FileText },
  { label: "Opportunities", href: "/vendor/opportunities", icon: Truck },
  { label: "RFP Responses", href: "/vendor/rfp-responses", icon: Send },
  { label: "Notification Preferences", href: "/vendor/notifications", icon: Bell },
  { label: "Settings", href: "/vendor/settings", icon: Settings },
]

export function VendorSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-navy text-navy-foreground lg:flex">
      <Link
        href="/vendor/dashboard"
        className="flex h-16 items-center gap-2 border-b border-white/10 px-5"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
          <ShieldCheck className="size-4 text-emerald" />
        </span>
        <span className="text-base font-bold tracking-tight">
          Grid<span className="text-brand-blue">Link</span>
        </span>
        <span className="ml-1 rounded bg-emerald/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald">
          Vendor
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href
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
        GridLink Vendor Portal
      </div>
    </aside>
  )
}
