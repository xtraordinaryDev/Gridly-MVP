"use client"

import Link from "next/link"
import {
  FileWarning,
  Building2,
  FileStack,
  LayoutDashboard,
  Mail,
  Receipt,
  Settings,
  ShieldCheck,
  Truck,
} from "lucide-react"

import { GridLinkLogo } from "@/components/brand/logo"
import { PortalMobileNav, PortalSidebar, type PortalNavItem } from "@/components/portal-nav"

const NAV: PortalNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Applications", href: "/admin/applications", icon: FileStack },
  { label: "Vendors", href: "/admin/vendors", icon: ShieldCheck },
  { label: "Buyers", href: "/admin/buyers", icon: Building2 },
  { label: "RFPs", href: "/admin/rfps", icon: Truck },
  { label: "Compliance", href: "/admin/compliance", icon: FileWarning },
  { label: "Updates", href: "/admin/updates", icon: Mail },
  { label: "Expenses", href: "/admin/expenses", icon: Receipt },
  { label: "Settings", href: "/admin/settings", icon: Settings },
]

const FOOTER = "GridLink Operations Console"

function Brand() {
  return (
    <Link href="/admin" className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-5">
      <GridLinkLogo tone="dark" />
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
