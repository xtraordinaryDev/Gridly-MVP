import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Database,
  FileCheck2,
  FileText,
  Fuel,
  Leaf,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Wand2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { siteUrl } from "@/emails/components/email-layout"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { HeroField } from "@/components/marketing/hero-field"
import { FeatureShowcase } from "@/components/marketing/feature-showcase"

const INDUSTRIES = [
  "Trucking & Logistics",
  "Food & Agriculture",
  "Manufacturing",
  "Municipalities",
  "Airports",
  "Hospitals",
  "Utilities",
]

/** The three AI features that ship in the product today. Each maps to a real action in src/app/ai/actions.ts. */
const AI_FEATURES = [
  {
    icon: Wand2,
    eyebrow: "Draft with AI",
    title: "Describe the need. Get the RFP.",
    description:
      "Type one sentence — “Diesel for 40 trucks across our Dallas and Tulsa yards, start next month” — and GridLink AI writes the complete RFP: fuel type, estimated gallons, delivery states, required capabilities and certifications, insurance minimums, and bid, decision and award dates.",
    proof: "Every inference is listed as an assumption for you to confirm before you publish.",
  },
  {
    icon: Target,
    eyebrow: "Supplier Match",
    title: "The right suppliers, ranked and explained.",
    description:
      "AI scores every verified supplier against your RFP on coverage, capabilities, certifications, scale and track record, then recommends who to invite. Each score comes with a one-line reason drawn from that supplier's actual profile — never a generic pitch.",
    proof: "Weighs geography first, then capability, then volume fit, then emergency responsiveness when the clock matters.",
  },
  {
    icon: FileText,
    eyebrow: "Bid Brief",
    title: "Bids compared. One recommendation.",
    description:
      "When bids land, GridLink AI reads all of them and writes the brief a senior buyer would: a one-sentence verdict, the supplier it would award and why, strengths and concerns for every bid, cross-cutting risks like short validity windows or index exposure, and the exact asks to make before you sign.",
    proof: "Quotes the real numbers from the bids. You still make the award.",
  },
]

const PLATFORM = [
  {
    id: "verified-network",
    icon: BadgeCheck,
    title: "Verified Supplier Network",
    description:
      "Every supplier is reviewed by GridLink before they can bid: company profile, W-9, insurance, licenses and coverage, all on file.",
  },
  {
    id: "compliance",
    icon: ShieldCheck,
    title: "Compliance That Watches Itself",
    description:
      "Insurance, licenses and certifications tracked per supplier with expirations surfaced to both sides before anything lapses.",
  },
  {
    id: "fuel-prices",
    icon: Fuel,
    title: "Live Market Benchmarks",
    description:
      "Weekly EIA diesel and gasoline prices for your regions, plus station prices near your sites, so every bid is judged against the market.",
  },
  {
    id: "contract-to-cash",
    icon: Database,
    title: "Contract to Invoice",
    description:
      "Awards become contracts. Orders, delivery tickets, invoices and payments run against them, so volume and spend are never a mystery.",
  },
  {
    id: "emissions",
    icon: Leaf,
    title: "Scope 1 Emissions, Automatically",
    description:
      "Every delivered gallon is converted to CO₂e with published factors, giving you reportable emissions as a by-product of buying fuel.",
  },
  {
    id: "audit-trail",
    icon: FileCheck2,
    title: "Audit-Ready by Default",
    description:
      "Every invitation, bid, brief and award is timestamped. Procurement officers get the documented competitive process they are required to show.",
  },
]

const STEPS = [
  {
    icon: Wand2,
    title: "Describe what you need",
    description:
      "One sentence in, a complete RFP out. Review the assumptions AI flagged, adjust anything, and publish.",
  },
  {
    icon: Send,
    title: "Invite the suppliers AI recommends",
    description:
      "Supplier Match ranks the verified network for this specific RFP. Tick the ones you want and the invitations go out.",
  },
  {
    icon: Trophy,
    title: "Award from the brief",
    description:
      "Bids arrive structured and side by side. Read the Bid Brief, make the asks it suggests, and award. The contract is created for you.",
  },
]

const TITLE = "GridLink — AI-Powered Fuel Procurement"
const DESCRIPTION =
  "Describe your fuel need in one sentence. GridLink AI drafts the RFP, ranks verified suppliers, and briefs you on every bid. You make the award."

export const metadata: Metadata = {
  // Resolves the relative canonical / Open Graph URLs below.
  metadataBase: new URL(siteUrl()),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "GridLink",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
}

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section
          id="platform"
          className="relative overflow-hidden border-b border-border bg-white"
        >
          {/* Animated fuel-grid field: dots ride slow waves and swell toward the pointer. */}
          <HeroField className="pointer-events-none absolute inset-0 h-full w-full" />
          {/* Calm zone behind the headline so the dots never fight the copy. */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_45%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.4)_55%,rgba(255,255,255,0)_100%)] lg:bg-[radial-gradient(ellipse_42%_75%_at_26%_50%,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.45)_60%,rgba(255,255,255,0)_100%)]" />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:py-28 lg:px-8">
            <div>
              <Badge
                variant="secondary"
                className="mb-6 gap-1.5 rounded-full border border-brand-blue/20 bg-brand-blue/10 px-3 py-1 text-brand-blue"
              >
                <Sparkles className="size-3.5" />
                AI-native fuel procurement
              </Badge>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-navy sm:text-5xl lg:text-6xl">
                Buy fuel like you have a procurement team of twenty.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Describe what you need in one sentence. GridLink AI drafts the
                RFP, ranks the verified suppliers who can actually deliver, and
                briefs you on every bid with a recommendation. You make the
                award and the paperwork is already done.
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
              <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                {["RFP drafted in seconds", "Suppliers ranked with reasons", "Bids compared, one pick"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <BadgeCheck className="size-4 shrink-0 text-emerald" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-brand-blue/10 blur-2xl" />
              <BidBriefPreview />
            </div>
          </div>
        </section>

        {/* Product showcase: tabbed, animated screens from the app */}
        <FeatureShowcase />

        {/* Industry strip */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Built for fleets and facilities that buy fuel in bulk
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {INDUSTRIES.map((industry) => (
                <span
                  key={industry}
                  className="text-sm font-semibold text-muted-foreground/60 transition-colors hover:text-navy"
                >
                  {industry}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* AI */}
        <section id="ai" className="scroll-mt-16 bg-navy text-white">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <Badge className="mb-5 gap-1.5 rounded-full bg-brand-blue/20 text-white">
                <Sparkles className="size-3.5" />
                GridLink AI
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                AI that does the procurement work, not just the chat.
              </h2>
              <p className="mt-4 text-lg text-white/70">
                Three jobs that used to take a buyer days now take minutes, and
                every output is grounded in your RFP, your suppliers&apos;
                verified profiles, and the bids in front of you.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {AI_FEATURES.map((feature) => (
                <div
                  key={feature.eyebrow}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-brand-blue/20 text-brand-blue">
                      <feature.icon className="size-5" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-brand-blue">
                      {feature.eyebrow}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 flex-1 leading-relaxed text-white/70">{feature.description}</p>
                  <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/60">{feature.proof}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:grid-cols-3">
              {[
                { icon: Lock, title: "Grounded, not generative", text: "GridLink AI never invents suppliers, prices or facts. It only reasons over the data in your account." },
                { icon: BadgeCheck, title: "You keep the decision", text: "AI recommends. A person publishes the RFP, picks the invitees and makes the award, every time." },
                { icon: FileCheck2, title: "Every brief is kept", text: "Drafts, rankings and bid briefs are saved to the RFP, so the reasoning behind each award is on the record." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <item.icon className="mt-0.5 size-5 shrink-0 text-emerald" />
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-white/60">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform */}
        <section id="solutions" className="scroll-mt-16 bg-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                The platform underneath the AI
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Good recommendations need good data. GridLink verifies every
                supplier, tracks every document, and records every gallon, so
                the AI has something true to reason about.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORM.map((feature) => (
                <Card
                  key={feature.title}
                  id={feature.id}
                  className="scroll-mt-24 border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-md"
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
        <section id="how-it-works" className="scroll-mt-16 border-y border-border bg-accent/30">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                From one sentence to a signed contract
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Three steps. AI does the drafting, matching and analysis. You
                approve each one.
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
            <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/60 to-white px-8 py-14 sm:px-14">
              <div className="grid items-center gap-8 lg:grid-cols-[1.6fr_1fr]">
                <div>
                  <Badge className="mb-5 gap-1.5 rounded-full bg-emerald/15 text-emerald">
                    <BadgeCheck className="size-3.5" />
                    GridLink Verified
                  </Badge>
                  <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                    Suppliers: get matched to RFPs you can actually win
                  </h2>
                  <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                    Verify once and GridLink AI puts you in front of buyers
                    whose fuel, geography and requirements fit your operation.
                    Qualified invitations, structured bids, and a fair read of
                    every proposal. No cold calls.
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

/** Illustrative Bid Brief for the hero. Mirrors the shape of a real GridLink AI brief; names and prices are examples. */
function BidBriefPreview() {
  const bids = [
    { name: "Heartland Energy", price: "$5.71", verdict: "Recommended", tone: "emerald" as const, note: "Lowest total by 2.1%; net-45; 96% on-time" },
    { name: "Apex Fuel Co.", price: "$5.78", verdict: "Strong alternative", tone: "blue" as const, note: "Best delivery record; bid valid only 7 days" },
    { name: "Summit Petroleum", price: "$5.84", verdict: "Consider", tone: "muted" as const, note: "Index-priced; OPIS exposure on 60% of volume" },
  ]
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
        <span className="size-2.5 rounded-full bg-destructive/40" />
        <span className="size-2.5 rounded-full bg-amber-400/50" />
        <span className="size-2.5 rounded-full bg-emerald/50" />
        <span className="ml-3 text-xs font-medium text-muted-foreground">
          GridLink · Diesel — Dallas &amp; Tulsa yards
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-blue">
            <Sparkles className="size-3.5" />
            Bid Brief
          </div>
          <p className="mt-2 text-sm font-semibold leading-snug text-navy">
            Heartland is lowest by 2.1% and offers net-45 terms; Apex has the
            stronger delivery record but a 7-day validity window.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Recommendation: award Heartland. Ask Apex to extend validity before deciding.
          </p>
        </div>

        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold text-navy">3 bids received</span>
            <Badge className="gap-1 bg-emerald/15 text-emerald">
              <BadgeCheck className="size-3" />
              All verified
            </Badge>
          </div>
          <div className="divide-y divide-border">
            {bids.map((row) => (
              <div key={row.name} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-[10px] font-bold text-brand-blue">
                      {row.name.charAt(0)}
                    </span>
                    <span className="truncate text-sm text-foreground">{row.name}</span>
                  </div>
                  <p className="mt-1 truncate pl-8 text-[11px] text-muted-foreground">{row.note}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-navy">{row.price}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      row.tone === "emerald" && "bg-emerald/15 text-emerald",
                      row.tone === "blue" && "bg-brand-blue/10 text-brand-blue",
                      row.tone === "muted" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {row.verdict}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Risk flagged</p>
            <p className="mt-1 text-xs text-foreground">Summit&apos;s index pricing exposes 60% of volume to OPIS swings.</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Before you award</p>
            <p className="mt-1 text-xs text-foreground">Ask Heartland to hold price through Q1 start date.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
