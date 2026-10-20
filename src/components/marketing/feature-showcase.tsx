"use client"

import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleX,
  ClipboardList,
  FileCheck2,
  FileText,
  Fuel,
  Leaf,
  Receipt,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

/* ------------------------------------------------------------------ data */

type Tab = {
  id: string
  label: string
  title: string
  problems: string[]
  solutions: string[]
  href: string
  Scene: (props: { cycle: number }) => ReactNode
}

const ROTATE_MS = 9000

/* --------------------------------------------------------------- helpers */

/** Staggered entrance. Each child waits `delay` ms, then fades and slides in. */
function Reveal({ delay, children, className }: { delay: number; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 motion-reduce:animate-none", className)}
      style={{ animationDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}

/** A bar that grows to its width after `delay` ms. */
function Bar({ pct, delay, className }: { pct: number; delay: number; className?: string }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(pct), delay)
    return () => clearTimeout(t)
  }, [pct, delay])
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <span className={cn("block h-full rounded-full bg-brand-blue transition-[width] duration-700 ease-out motion-reduce:transition-none", className)} style={{ width: `${w}%` }} />
    </span>
  )
}

/** Text that types itself out after `delay` ms. */
function Typed({ text, delay, speed = 22, className }: { text: string; delay: number; speed?: number; className?: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const start = setTimeout(function tick() {
      i += 1
      setN(i)
      if (i < text.length) timer = setTimeout(tick, speed)
    }, delay)
    return () => {
      clearTimeout(start)
      clearTimeout(timer)
    }
  }, [text, delay, speed])
  return (
    <span className={className}>
      {text.slice(0, n)}
      {n < text.length ? <span className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 animate-pulse bg-current" /> : null}
    </span>
  )
}

function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-card shadow-2xl">
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/40" />
        <span className="size-2.5 rounded-full bg-amber-400/50" />
        <span className="size-2.5 rounded-full bg-emerald/50" />
        <span className="ml-3 truncate text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Row({ icon, title, sub, time, tone = "default", delay }: { icon: ReactNode; title: ReactNode; sub?: ReactNode; time?: string; tone?: "default" | "good" | "bad"; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className={cn("flex items-start gap-3 rounded-lg border px-3 py-2.5", tone === "good" ? "border-emerald/40 bg-emerald/5" : tone === "bad" ? "border-destructive/30 bg-destructive/5" : "border-transparent")}>
        <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", tone === "good" ? "bg-emerald/15 text-emerald" : tone === "bad" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-navy">{title}</span>
          {sub ? <span className="block text-xs text-muted-foreground">{sub}</span> : null}
        </span>
        {time ? <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{time}</span> : null}
      </div>
    </Reveal>
  )
}

/* ---------------------------------------------------------------- scenes */

function RfpScene() {
  return (
    <Window title="GridLink · New RFP">
      <Reveal delay={0}>
        <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-brand-blue"><Sparkles className="size-3.5" /> Draft with AI</div>
          <p className="mt-1.5 min-h-[2.5rem] text-sm text-foreground">
            <Typed delay={300} text="Diesel for 40 trucks at our Dallas and Tulsa yards, bulk delivered monthly, start November 1." />
          </p>
        </div>
      </Reveal>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          ["Fuel", "ULSD diesel"],
          ["Volume", "180,000 gal"],
          ["States", "TX, OK"],
          ["Bids due", "Oct 28"],
        ].map(([k, v], i) => (
          <Reveal key={k} delay={2600 + i * 180}>
            <div className="rounded-lg border border-border p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
              <div className="font-medium text-navy">{v}</div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={3500} className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-navy">Bids received</span>
          <Badge className="gap-1 bg-emerald/15 text-emerald"><BadgeCheck className="size-3" /> 3 verified</Badge>
        </div>
      </Reveal>
      <div className="mt-2 space-y-1.5">
        {[
          ["Heartland Energy", "$5.71 / gal · net-45 · 96% on time", "Recommended", "good"],
          ["Apex Fuel Co.", "$5.78 / gal · best delivery record", "Strong alternative", "default"],
          ["Summit Petroleum", "$5.84 / gal · index priced", "Consider", "default"],
        ].map(([name, sub, verdict, tone], i) => (
          <Row key={name} delay={3900 + i * 500} tone={tone as "good" | "default"} icon={<span className="text-[10px] font-bold">{String(name).charAt(0)}</span>} title={name} sub={sub} time={verdict} />
        ))}
      </div>
    </Window>
  )
}

function NetworkScene() {
  const checks = [
    ["Company profile", "Rivera Fuels, Inc. · LLC · est. 2015"],
    ["W-9", "Received Oct 14"],
    ["Certificate of insurance", "$2M GL · $1M auto · expires Jun 2027"],
    ["Distributor licence", "Texas · verified"],
    ["USDOT 1234567", "Active · hazmat"],
  ]
  return (
    <Window title="GridLink · Admin · Applications">
      <Reveal delay={0}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-navy">Rivera Fuels, Inc.</div>
            <div className="text-xs text-muted-foreground">Dallas, TX · Diesel, DEF, gasoline · Serves TX, OK, LA</div>
          </div>
          <Badge className="bg-amber-100 text-amber-700">Pending review</Badge>
        </div>
      </Reveal>
      <div className="mt-4 space-y-1.5">
        {checks.map(([title, sub], i) => (
          <Row key={title} delay={500 + i * 550} tone="good" icon={<CheckCircle2 className="size-3.5" />} title={title} sub={sub} />
        ))}
      </div>
      <Reveal delay={500 + checks.length * 550 + 400} className="mt-4">
        <div className="flex items-center justify-between rounded-lg bg-navy px-4 py-3 text-white">
          <span className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-emerald" /> GridLink Verified</span>
          <span className="text-xs text-white/70">Visible to every buyer in TX, OK, LA</span>
        </div>
      </Reveal>
    </Window>
  )
}

function DeliveryScene() {
  return (
    <Window title="GridLink · Orders · ORD-20461">
      <Reveal delay={0}>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Site</div><div className="font-medium text-navy">Tulsa yard · Tank 2</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Product</div><div className="font-medium text-navy">ULSD diesel</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Ordered</div><div className="font-medium text-navy">7,800 gal</div></div>
        </div>
      </Reveal>
      <div className="mt-4 space-y-1.5">
        <Row delay={500} icon={<ClipboardList className="size-3.5" />} title="Order placed against contract" sub="Heartland Energy · $5.71 / gal" time="7:02 AM" />
        <Row delay={1100} icon={<Truck className="size-3.5" />} title="Dispatched" sub="Truck 14 · ETA 10:30 AM" time="7:40 AM" />
        <Row delay={1700} icon={<Truck className="size-3.5" />} title="Delivered 7,780 gal" sub="Within 0.3% of order" time="10:21 AM" />
        <Row delay={2300} icon={<FileCheck2 className="size-3.5" />} title="Delivery ticket uploaded" sub="BOL 88213 · tank reading attached" time="10:24 AM" />
        <Row delay={2900} tone="good" icon={<Receipt className="size-3.5" />} title="Invoice generated · $44,423.80" sub="Due Nov 24 · emailed to accounts payable" time="10:25 AM" />
      </div>
    </Window>
  )
}

function InvoiceScene() {
  const rows = [
    ["INV-1041", "Heartland Energy", "$44,423.80", "Paid", "good"],
    ["INV-1042", "Apex Fuel Co.", "$18,902.10", "Viewed", "default"],
    ["INV-1043", "Heartland Energy", "$46,120.00", "Sent", "default"],
    ["INV-1038", "Summit Petroleum", "$9,410.50", "Disputed", "bad"],
  ] as const
  return (
    <Window title="GridLink · Invoices">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Outstanding", "$74,432", 72],
          ["Due this week", "$18,902", 30],
          ["Paid YTD", "$412,980", 100],
        ].map(([k, v, pct], i) => (
          <Reveal key={k} delay={i * 180}>
            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
              <div className="text-lg font-bold tabular-nums text-navy">{v}</div>
              <div className="mt-2"><Bar pct={pct as number} delay={600 + i * 150} /></div>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {rows.map(([num, vendor, amt, status, tone], i) => (
          <Row key={num} delay={1200 + i * 450} tone={tone} icon={tone === "good" ? <CheckCircle2 className="size-3.5" /> : tone === "bad" ? <CircleX className="size-3.5" /> : <FileText className="size-3.5" />} title={<span>{num} <span className="font-normal text-muted-foreground">· {vendor}</span></span>} sub={status === "Disputed" ? "Short delivery claimed · supplier responded" : undefined} time={`${amt} · ${status}`} />
        ))}
      </div>
    </Window>
  )
}

function PricesScene() {
  return (
    <Window title="GridLink · Dashboard">
      <Reveal delay={0}>
        <div className="flex items-center gap-2 text-sm font-semibold text-navy"><Fuel className="size-4 text-brand-blue" /> Fuel prices near your sites</div>
      </Reveal>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ["Gulf Coast diesel", "$5.96", 81],
          ["Midwest diesel", "$6.53", 89],
          ["U.S. average", "$6.38", 87],
        ].map(([k, v, pct], i) => (
          <Reveal key={k} delay={300 + i * 200}>
            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
              <div className="text-lg font-bold tabular-nums text-navy">{v}<span className="text-xs font-normal text-muted-foreground"> /gal</span></div>
              <div className="mt-2"><Bar pct={pct as number} delay={900 + i * 150} /></div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={1500} className="mt-3">
        <div className="rounded-lg border border-emerald/30 bg-emerald/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy"><Leaf className="size-4 text-emerald" /> Scope 1 emissions, year to date</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div><div className="text-lg font-bold tabular-nums text-navy">1,842 t</div><div className="text-muted-foreground">CO₂e from 180,900 gal</div></div>
            <div><div className="text-lg font-bold tabular-nums text-navy">10.21</div><div className="text-muted-foreground">kg CO₂e per gal diesel</div></div>
            <div><div className="text-lg font-bold tabular-nums text-emerald">−6%</div><div className="text-muted-foreground">vs 2025 target</div></div>
          </div>
          <div className="mt-2"><Bar pct={62} delay={2100} className="bg-emerald" /></div>
        </div>
      </Reveal>
    </Window>
  )
}

const TABS: Tab[] = [
  {
    id: "rfp",
    label: "RFPs & Bids",
    title: "Competitive bids, not one phone call.",
    problems: ["One quote from the supplier you already know", "Specs scattered across email and spreadsheets", "No record of why a price was accepted"],
    solutions: ["AI drafts the RFP from one sentence", "Verified suppliers bid side by side", "A bid brief recommends one and says why"],
    href: "/#ai",
    Scene: RfpScene,
  },
  {
    id: "network",
    label: "Verified Network",
    title: "Every supplier checked before they can bid.",
    problems: ["Insurance that expired months ago", "Licences nobody asked to see", "Suppliers outside your states"],
    solutions: ["W-9, insurance and licences on file", "Expiry tracked and chased automatically", "Matched to your fuel, states and volume"],
    href: "/become-a-supplier",
    Scene: NetworkScene,
  },
  {
    id: "delivery",
    label: "Orders & Deliveries",
    title: "From order to ticket to invoice, in one record.",
    problems: ["Deliveries confirmed by text message", "Tickets lost between the driver and AP", "Gallons invoiced that never arrived"],
    solutions: ["Orders placed against the awarded contract", "Delivery tickets attached to every drop", "Invoice generated from the ticket, not from memory"],
    href: "/#solutions",
    Scene: DeliveryScene,
  },
  {
    id: "invoices",
    label: "Invoices & Payments",
    title: "One ledger for every supplier.",
    problems: ["Invoices in five formats from five suppliers", "Disputes settled by phone with no trail", "No view of what is due this week"],
    solutions: ["Every invoice tied to its contract and delivery", "Disputes tracked to resolution in the open", "Payables and spend by supplier at a glance"],
    href: "/#solutions",
    Scene: InvoiceScene,
  },
  {
    id: "prices",
    label: "Prices & Emissions",
    title: "Know the market, and your footprint.",
    problems: ["No benchmark to judge a bid against", "Emissions reporting done by hand each year", "Price changes noticed after the invoice"],
    solutions: ["Weekly regional benchmarks on the dashboard", "Scope 1 CO₂e from every delivered gallon", "Every bid judged against the market"],
    href: "/#fuel-prices",
    Scene: PricesScene,
  },
]

/* ------------------------------------------------------------- component */

export function FeatureShowcase() {
  const [active, setActive] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [paused, setPaused] = useState(false)
  const [autoplay, setAutoplay] = useState(true)

  // Auto-advance through the tabs; stop once a visitor picks one themselves.
  useEffect(() => {
    if (paused || !autoplay) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = setTimeout(() => {
      setActive((a) => (a + 1) % TABS.length)
      setCycle((c) => c + 1)
    }, ROTATE_MS)
    return () => clearTimeout(t)
  }, [active, paused, cycle, autoplay])

  function pick(i: number) {
    setAutoplay(false)
    setActive(i)
    setCycle((c) => c + 1)
  }

  const tab = TABS[active]
  const Scene = tab.Scene

  return (
    <section id="showcase" className="scroll-mt-16 border-b border-border bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Not a fuel company. The layer on top of every supplier you use.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From the first RFP to the last invoice, every step of buying fuel in one place.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-12 overflow-x-auto">
          <div role="tablist" aria-label="Platform areas" className="mx-auto flex w-max min-w-full justify-start gap-1 border-b border-border sm:justify-center">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={i === active}
                onClick={() => pick(i)}
                className={cn(
                  "relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                  i === active ? "text-navy" : "text-muted-foreground hover:text-navy"
                )}
              >
                {t.label}
                <span className={cn("absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-blue transition-opacity", i === active ? "opacity-100" : "opacity-0")} />
                {i === active && autoplay && !paused ? (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 origin-left rounded-full bg-navy/30 motion-reduce:hidden" style={{ animation: `showcase-progress ${ROTATE_MS}ms linear forwards` }} />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Panel */}
        <div
          className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div key={`copy-${tab.id}-${cycle}`} className="animate-in fade-in slide-in-from-left-2 duration-500 motion-reduce:animate-none">
            <h3 className="text-balance text-2xl font-bold tracking-tight text-navy sm:text-3xl">{tab.title}</h3>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <span className="inline-flex items-center rounded-full border border-dashed border-destructive/50 px-2.5 py-0.5 text-xs font-semibold text-destructive">Before</span>
                <ul className="mt-3 divide-y divide-dashed divide-border">
                  {tab.problems.map((p) => (
                    <li key={p} className="flex items-start gap-2 py-2.5 text-sm text-muted-foreground"><CircleX className="mt-0.5 size-4 shrink-0 text-destructive/70" />{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="inline-flex items-center rounded-full border border-dashed border-emerald/60 px-2.5 py-0.5 text-xs font-semibold text-emerald">With GridLink</span>
                <ul className="mt-3 divide-y divide-dashed divide-border">
                  {tab.solutions.map((s) => (
                    <li key={s} className="flex items-start gap-2 py-2.5 text-sm text-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald" />{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <Link href={tab.href} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-8 gap-2")}>
              See how it works <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-navy p-5 sm:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand-blue/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-emerald/30 blur-3xl" />
            <div key={`scene-${tab.id}-${cycle}`} className="relative">
              <Scene cycle={cycle} />
            </div>
            <div className="relative mt-4 flex items-center justify-between text-[11px] text-white/60">
              <span className="flex items-center gap-1.5"><Users className="size-3.5" /> Shown with sample data from the test site</span>
              <Link href="https://test.gridlink.global/login" className="font-medium text-white/80 underline-offset-2 hover:underline">Try it live</Link>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes showcase-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
    </section>
  )
}
