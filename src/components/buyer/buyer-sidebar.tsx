"use client"

import Link from "next/link"
import {
  Bookmark,
  Handshake,
  Truck,
  Receipt,
  FileStack,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react"

import { GridLinkLogo } from "@/components/brand/logo"
import { PortalMobileNav, PortalSidebar, type PortalNavItem } from "@/components/portal-nav"

const NAV: PortalNavItem[] = [
  { label: "Dashboard", href: "/buyer/dashboard", icon: LayoutDashboard },
  { label: "Verified Directory", href: "/buyer/directory", icon: Search },
  { label: "My RFPs", href: "/buyer/rfps", icon: FileStack },
  { label: "Saved Suppliers", href: "/buyer/saved", icon: Bookmark },
  { label: "Contracts", href: "/buyer/contracts", icon: Handshake },
  { label: "Orders", href: "/buyer/orders", icon: Truck },
  { label: "Invoices", href: "/buyer/invoices", icon: Receipt },
  { label: "Settings", href: "/buyer/settings", icon: Settings },
]

const FOOTER = "GridLink Buyer Portal"

function Brand() {
  return (
    <Link href="/buyer/dashboard" className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-5">
      <GridLinkLogo tone="dark" />
    </Link>
  )
}

export function BuyerSidebar() {
  return <PortalSidebar items={NAV} brand={<Brand />} footer={FOOTER} />
}

export function BuyerMobileNav() {
  return <PortalMobileNav items={NAV} brand={<Brand />} footer={FOOTER} />
}
