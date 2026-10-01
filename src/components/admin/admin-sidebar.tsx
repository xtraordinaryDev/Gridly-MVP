"use client"

import Link from "next/link"
import {
  FileWarning,
  Building2,
  FileStack,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react"

import { PortalMobileNav, PortalSidebar, type PortalNavItem } from "@/components/portal-nav"

const NAV: PortalNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Applications", href: "/admin/applications", icon: FileStack },
  { label: "Verified Vendors", href: "/admin/vendors", icon: ShieldCheck },
  { label: "Buyers", href: "/admin/buyers", icon: Building2 },
  { label: "RFPs", href: "/admin/rfps", icon: Truck },
  { label: "Compliance", href: "/admin/compliance", icon: FileWarning },
  { label: "Settings", href: "/admin/settings", icon: Settings },
]

const FOOTER = "GridLink Operations Console"

function Brand() {
  return (
    <Link href="/admin" className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-5">
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
  )
}

export function AdminSidebar() {
  return <PortalSidebar items={NAV} brand={<Brand />} footer={FOOTER} />
}

export function AdminMobileNav() {
  return <PortalMobileNav items={NAV} brand={<Brand />} footer={FOOTER} />
}
