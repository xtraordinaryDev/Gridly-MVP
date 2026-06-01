import Link from "next/link"
import {
  BadgeCheck,
  CheckCircle2,
  Eye,
  Gauge,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react"

import { requireVendor } from "@/lib/auth"
import {
  listVendorOpportunities,
  resolveVendorIdForSession,
} from "@/lib/data/rfps"
import {
  getCurrentVendor,
  getDashboardStats,
  getOpportunities,
  getVendorActivity,
} from "@/lib/data/vendor"
import { Card, CardContent } from "@/components/ui/card"
import { OpportunitiesTable } from "@/components/vendor/opportunities-table"

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function relative(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

const ACTIVITY_ICON = {
  verified: BadgeCheck,
  invited: Truck,
  submitted: Send,
  viewed: Eye,
} as const

export default async function VendorDashboardPage() {
  const { profile, preview } = await requireVendor()
  const vendor = await getCurrentVendor()
  if (!vendor) return null

  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const [opportunities, oppList, activity] = await Promise.all([
    getOpportunities(),
    listVendorOpportunities(vendorId),
    getVendorActivity(),
  ])
  const stats = getDashboardStats(vendor, opportunities)

  const kpis = [
    { label: "New opportunities this week", value: stats.newOpportunitiesThisWeek, icon: Sparkles, accent: "text-brand-blue bg-brand-blue/10" },
    { label: "Active RFPs invited to", value: stats.activeRfpInvites, icon: Truck, accent: "text-navy bg-navy/10" },
    { label: "Bids submitted YTD", value: stats.bidsSubmittedYtd, icon: Send, accent: "text-emerald bg-emerald/15" },
    { label: "Profile completeness", value: `${stats.profileCompleteness}%`, icon: Gauge, accent: "text-amber-600 bg-amber-100" },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Verified hero strip */}
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-navy to-navy/85 text-navy-foreground shadow-sm">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald/20 ring-1 ring-emerald/40">
              <ShieldCheck className="size-8 text-emerald" />
            </span>
            <div>
              <p className="flex items-center gap-2 text-lg font-bold">
                GridLink Verified
              </p>
              <p className="text-sm text-white/70">
                {vendor.companyName}
                {vendor.verifiedAt
                  ? ` · Verified ${formatDate(vendor.verifiedAt)}`
                  : ""}
              </p>
            </div>
          </div>
          <Link
            href="/vendor/profile?preview=1"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <Eye className="size-4" />
            View public profile
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <span className={`flex size-10 items-center justify-center rounded-xl ${kpi.accent}`}>
                <kpi.icon className="size-5" />
              </span>
              <p className="mt-4 text-3xl font-bold text-navy">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent opportunities */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy">
              Recent opportunities
            </h2>
            <Link
              href="/vendor/opportunities"
              className="text-sm font-medium text-brand-blue hover:underline"
            >
              View all
            </Link>
          </div>
          <OpportunitiesTable opportunities={oppList.slice(0, 5)} />
        </div>

        {/* Activity feed */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-navy">Activity</h2>
          <Card>
            <CardContent className="p-5">
              <ol className="space-y-5">
                {activity.map((event, i) => {
                  const Icon = ACTIVITY_ICON[event.type] ?? CheckCircle2
                  return (
                    <li key={event.id} className="relative flex gap-3">
                      {i < activity.length - 1 ? (
                        <span className="absolute left-[15px] top-9 h-[calc(100%-4px)] w-px bg-border" />
                      ) : null}
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-navy">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm leading-snug text-foreground">
                          {event.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {relative(event.date)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
