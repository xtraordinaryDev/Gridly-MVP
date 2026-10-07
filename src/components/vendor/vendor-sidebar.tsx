"use client"

import Link from "next/link"
import {
  Handshake,
  PackageCheck,
  Receipt,
  Bell,
  FileText,
  LayoutDashboard,
  Send,
  Settings,
  Truck,
  Building2,
} from "lucide-react"

import { GridLinkLogo } from "@/components/brand/logo"
import { PortalMobileNav, PortalSidebar, type PortalNavItem } from "@/components/portal-nav"

const NAV: PortalNavItem[] = [
  { label: "Dashboard", href: "/vendor/dashboard", icon: LayoutDashboard },
  { label: "Company Profile", href: "/vendor/profile", icon: Building2 },
  { label: "Documents", href: "/vendor/documents", icon: FileText },
  { label: "Opportunities", href: "/vendor/opportunities", icon: Truck },
  { label: "RFP Responses", href: "/vendor/rfp-responses", icon: Send },
  { label: "Contracts", href: "/vendor/contracts", icon: Handshake },
  { label: "Orders", href: "/vendor/orders", icon: PackageCheck },
  { label: "Invoices", href: "/vendor/invoices", icon: Receipt },
  { label: "Notification Preferences", href: "/vendor/notifications", icon: Bell },
  { label: "Settings", href: "/vendor/settings", icon: Settings },
]

const FOOTER = "GridLink Vendor Portal"

function Brand() {
  return (
    <Link href="/vendor/dashboard" className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-5">
      <GridLinkLogo tone="dark" />
      <span className="ml-1 rounded bg-emerald/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald">
        Vendor
      </span>
    </Link>
  )
}

export function VendorSidebar() {
  return <PortalSidebar items={NAV} brand={<Brand />} footer={FOOTER} width="w-64" />
}

export function VendorMobileNav() {
  return <PortalMobileNav items={NAV} brand={<Brand />} footer={FOOTER} />
}
