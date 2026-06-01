import Link from "next/link"
import {
  ArrowUpRight,
  Building2,
  Clock,
  FileStack,
  ShieldCheck,
  Truck,
} from "lucide-react"

import { getDashboardStats, listApplications } from "@/lib/data/applications"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, SourceBadge } from "@/components/admin/status-badge"

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function AdminDashboardPage() {
  const [stats, applications] = await Promise.all([
    getDashboardStats(),
    listApplications(),
  ])

  const recent = applications.slice(0, 5)

  const kpis = [
    {
      label: "Pending applications",
      value: stats.pendingApplications,
      icon: Clock,
      href: "/admin/applications?status=pending_review",
      accent: "text-amber-600 bg-amber-100",
    },
    {
      label: "Verified vendors",
      value: stats.verifiedVendors,
      icon: ShieldCheck,
      href: "/admin/vendors",
      accent: "text-emerald bg-emerald/15",
    },
    {
      label: "Active RFPs",
      value: stats.activeRfps,
      icon: Truck,
      href: "/admin/rfps",
      accent: "text-brand-blue bg-brand-blue/10",
    },
    {
      label: "Buyer organizations",
      value: stats.buyerOrganizations,
      icon: Building2,
      href: "/admin/buyers",
      accent: "text-navy bg-navy/10",
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Platform overview and review queue.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="group">
            <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl ${kpi.accent}`}
                  >
                    <kpi.icon className="size-5" />
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-4 text-3xl font-bold text-navy">{kpi.value}</p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <FileStack className="size-4 text-muted-foreground" />
              <h2 className="font-semibold text-navy">Recent applications</h2>
            </div>
            <Link
              href="/admin/applications"
              className="text-sm font-medium text-brand-blue hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recent.map((app) => (
              <Link
                key={app.id}
                href={`/admin/applications/${app.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy">
                    {app.companyName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(app.submittedAt)} · {app.states.length} states ·{" "}
                    {app.products.length} products
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SourceBadge source={app.source} />
                  <StatusBadge status={app.status} />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
