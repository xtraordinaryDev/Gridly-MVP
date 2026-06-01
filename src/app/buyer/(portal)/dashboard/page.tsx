import Link from "next/link"
import {
  Award,
  ClipboardList,
  FilePlus,
  Search,
  Send,
  Users,
} from "lucide-react"

import { getBuyerDashboardStats, getBuyerRfpActivity } from "@/lib/data/buyer"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

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
  published: ClipboardList,
  bid: Send,
  awarded: Award,
  closed: ClipboardList,
} as const

export default async function BuyerDashboardPage() {
  const [stats, activity] = await Promise.all([
    getBuyerDashboardStats(),
    getBuyerRfpActivity(),
  ])

  const kpis = [
    {
      label: "Active RFPs",
      value: stats.activeRfps,
      icon: ClipboardList,
      href: "/buyer/rfps",
      accent: "text-brand-blue bg-brand-blue/10",
    },
    {
      label: "Suppliers in network",
      value: stats.suppliersInNetwork,
      icon: Users,
      href: "/buyer/directory",
      accent: "text-emerald bg-emerald/15",
    },
    {
      label: "Bids received",
      value: stats.bidsReceived,
      icon: Send,
      href: "/buyer/rfps",
      accent: "text-navy bg-navy/10",
    },
    {
      label: "Awarded contracts",
      value: stats.awardedContracts,
      icon: Award,
      href: "/buyer/rfps",
      accent: "text-amber-600 bg-amber-100",
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Your procurement command center.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/buyer/rfps/new"
            className={cn(buttonVariants(), "gap-2")}
          >
            <FilePlus className="size-4" />
            Create RFP
          </Link>
          <Link
            href="/buyer/directory"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Search className="size-4" />
            Browse Directory
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${kpi.accent}`}
                >
                  <kpi.icon className="size-5" />
                </span>
                <p className="mt-4 text-3xl font-bold text-navy">{kpi.value}</p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-navy">Recent RFP activity</h2>
          <ol className="mt-5 space-y-5">
            {activity.map((event, i) => {
              const Icon = ACTIVITY_ICON[event.type]
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
  )
}
