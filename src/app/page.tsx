import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Database,
  FileCheck2,
  Gauge,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"

const INDUSTRIES = [
  "Food & Agriculture",
  "Logistics",
  "Manufacturing",
  "Airports",
  "Hospitals",
  "Utilities",
  "Government",
]

const FEATURES = [
  {
    icon: Gauge,
    title: "Fuel Procurement Automation",
    description:
      "Launch sourcing events, collect structured bids, and replace email-and-spreadsheet chaos with a single workflow.",
  },
  {
    icon: Database,
    title: "Vendor Vault",
    description:
      "A centralized, verified supplier database with capabilities, coverage, and compliance — searchable in seconds.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Infrastructure",
    description:
      "Track insurance, licenses, and certifications with expirations surfaced before they ever lapse.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Bid Management",
    description:
      "Normalize responses and compare suppliers side by side so the best-qualified bid is always obvious.",
  },
  {
    icon: FileCheck2,
    title: "Audit-Ready Documentation",
    description:
      "Every invitation, response, and award captured with a timestamped trail your auditors will love.",
  },
]

const STEPS = [
  {
    icon: ClipboardList,
    title: "Launch a sourcing event",
    description:
      "Define fuel type, volume, delivery geography, and the capabilities you require — in minutes.",
  },
  {
    icon: Send,
    title: "Invite verified suppliers",
    description:
      "Reach GridLink Verified suppliers that already meet your compliance bar, then collect structured bids.",
  },
  {
    icon: Trophy,
    title: "Award & track",
    description:
      "Compare bids side by side, award with confidence, and keep the full audit trail in one system of record.",
  },
]

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section
          id="platform"
          className="relative overflow-hidden border-b border-border bg-gradient-to-b from-white to-accent/40"
        >
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:py-28 lg:px-8">
            <div>
              <Badge
                variant="secondary"
                className="mb-6 gap-1.5 rounded-full border border-brand-blue/20 bg-brand-blue/10 px-3 py-1 text-brand-blue"
              >
                <BadgeCheck className="size-3.5" />
                GridLink Verified Network
              </Badge>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-navy sm:text-5xl lg:text-6xl">
                The Procurement Operating System for Fuel.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Source fuel faster. Compare qualified suppliers. Automate
                compliance. Award contracts — all through a single system of
                record.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={cn(buttonVariants({ size: "lg" }), "gap-2")}
                >
                  Request a Demo
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/become-a-supplier"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Become a Verified Supplier
                </Link>
              </div>
            </div>

            {/* Buyer dashboard preview (placeholder mockup) */}
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-brand-blue/10 blur-2xl" />
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* Logo strip */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Trusted by leaders in
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {INDUSTRIES.map((industry) => (
                <span
                  key={industry}
                  className="text-sm font-semibold text-muted-foreground/60 grayscale transition-colors hover:text-navy"
                >
                  {industry}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* What GridLink Delivers */}
        <section id="solutions" className="bg-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                What GridLink Delivers
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything procurement teams need to source, qualify, and award
                fuel contracts — without leaving the platform.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card
                  key={feature.title}
                  className="border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-md"
                >
                  <CardHeader>
                    <span className="flex size-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                      <feature.icon className="size-5" />
                    </span>
                    <CardTitle className="mt-4 text-lg text-navy">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="about" className="border-y border-border bg-accent/30">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                How it works
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From sourcing event to awarded contract in three steps.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="relative">
                  <div className="flex items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-navy text-lg font-bold text-navy-foreground">
                      {index + 1}
                    </span>
                    <span className="flex size-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                      <step.icon className="size-5" />
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-navy">
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Suppliers */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl bg-navy px-8 py-14 sm:px-14">
              <div className="grid items-center gap-8 lg:grid-cols-[1.6fr_1fr]">
                <div>
                  <Badge className="mb-5 gap-1.5 rounded-full bg-emerald/15 text-emerald">
                    <BadgeCheck className="size-3.5" />
                    GridLink Verified
                  </Badge>
                  <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Join the GridLink Verified Network
                  </h2>
                  <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
                    Get in front of enterprise fuel buyers actively sourcing in
                    your region. Get verified once, win business everywhere.
                  </p>
                </div>
                <div className="flex lg:justify-end">
                  <Link
                    href="/become-a-supplier"
                    className={cn(buttonVariants({ size: "lg" }), "gap-2")}
                  >
                    Become a Supplier
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}

/** Placeholder buyer dashboard mockup for the hero. */
function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
        <span className="size-2.5 rounded-full bg-destructive/40" />
        <span className="size-2.5 rounded-full bg-amber-400/50" />
        <span className="size-2.5 rounded-full bg-emerald/50" />
        <span className="ml-3 text-xs font-medium text-muted-foreground">
          GridLink · Sourcing Dashboard
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active RFPs", value: "12" },
            { label: "Verified Vendors", value: "248" },
            { label: "Avg. Award Time", value: "2.4d" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-background p-3"
            >
              <p className="text-xl font-bold text-navy">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold text-navy">
              Diesel — Midwest Q3
            </span>
            <Badge className="gap-1 bg-emerald/15 text-emerald">
              <BadgeCheck className="size-3" />
              4 verified bids
            </Badge>
          </div>
          <div className="divide-y divide-border">
            {[
              { name: "Apex Fuel Co.", price: "$3.42", best: true },
              { name: "Heartland Energy", price: "$3.48", best: false },
              { name: "Summit Petroleum", price: "$3.51", best: false },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-brand-blue/10 text-[10px] font-bold text-brand-blue">
                    {row.name.charAt(0)}
                  </span>
                  <span className="text-sm text-foreground">{row.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-navy">
                    {row.price}
                  </span>
                  {row.best ? (
                    <Badge
                      variant="secondary"
                      className="bg-emerald/15 text-[10px] text-emerald"
                    >
                      Best
                    </Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
