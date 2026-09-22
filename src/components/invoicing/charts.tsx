import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import type { AgingBucket, MonthPoint, NamedAmount } from "@/lib/invoicing/types"
import { money } from "@/lib/invoicing/types"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Chart colors. Two categorical series (invoiced vs paid) use the brand blue and
// emerald pair; magnitude (aging) uses a single blue ramp light→dark.
export const SERIES = { invoiced: "#3B82F6", paid: "#10B981" } as const
const AGING_RAMP = ["#60A5FA", "#3B82F6", "#1D4ED8", "#1E40AF", "#172554"] as const
const INK = { primary: "#0A2540", muted: "#6B7280", grid: "#E5E7EB" } as const

function compact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}

// ---------------------------------------------------------------------------
// Stat tile (hero number, no plot)
// ---------------------------------------------------------------------------
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  href,
  title,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  accent: string
  href?: string
  /** full, uncompacted value for the tooltip */
  title?: string
}) {
  const card = (
    <Card className={cn(href && "transition-all hover:-translate-y-0.5 hover:shadow-md")}>
      <CardContent className="p-5">
        <span className={cn("flex size-10 items-center justify-center rounded-xl", accent)}>
          <Icon className="size-5" />
        </span>
        <p className="mt-4 truncate text-2xl font-bold tabular-nums text-navy sm:text-3xl" title={title ?? value}>{value}</p>
        <p className="text-sm text-muted-foreground">
          {label}
          {hint ? <span className="text-muted-foreground/70"> · {hint}</span> : null}
        </p>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{card}</Link> : card
}

// ---------------------------------------------------------------------------
// Aging: one stacked horizontal bar, sequential ramp, direct labels
// ---------------------------------------------------------------------------
export function AgingBar({ buckets, title = "Receivables aging" }: { buckets: AgingBucket[]; title?: string }) {
  const total = buckets.reduce((s, b) => s + b.amount, 0)
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-navy">{title}</h2>
          <span className="text-sm tabular-nums text-muted-foreground">{money(total)} open</span>
        </div>
        {total <= 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing outstanding.</p>
        ) : (
          <>
            <div className="mt-4 flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
              {buckets.map((b, i) =>
                b.amount > 0 ? (
                  <div
                    key={b.key}
                    title={`${b.label}: ${money(b.amount)} (${b.count})`}
                    style={{ width: `${(b.amount / total) * 100}%`, backgroundColor: AGING_RAMP[i] }}
                    className="h-full"
                  />
                ) : null
              )}
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              {buckets.map((b, i) => (
                <li key={b.key} className="flex min-w-[7.5rem] items-start gap-2">
                  <span className="mt-1 size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: AGING_RAMP[i] }} />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{b.label}</p>
                    <p className="font-medium tabular-nums text-navy">{money(b.amount)}</p>
                    <p className="text-xs text-muted-foreground">{b.count} inv</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Horizontal bars: single series ranked by amount
// ---------------------------------------------------------------------------
export function RankedBars({
  title,
  items,
  color = SERIES.invoiced,
  empty = "No data yet.",
}: {
  title: string
  items: NamedAmount[]
  color?: string
  empty?: string
}) {
  const max = Math.max(...items.map((i) => i.amount), 1)
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.name} title={`${it.name}: ${money(it.amount)}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{it.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{money(it.amount)}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full" style={{ width: `${(it.amount / max) * 100}%`, backgroundColor: color }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Monthly grouped bars: invoiced vs paid (two series → legend + direct labels)
// ---------------------------------------------------------------------------
export function MonthlyBars({
  series,
  title = "Invoiced vs paid",
  labels = { invoiced: "Invoiced", paid: "Paid" },
}: {
  series: MonthPoint[]
  title?: string
  labels?: { invoiced: string; paid: string }
}) {
  const W = 560
  const H = 200
  const padL = 44
  const padB = 28
  const padT = 14
  const max = Math.max(...series.flatMap((m) => [m.invoiced, m.paid]), 1)
  const niceMax = (() => {
    const p = Math.pow(10, Math.floor(Math.log10(max)))
    const n = Math.ceil(max / p)
    return n * p
  })()
  const plotW = W - padL - 8
  const plotH = H - padT - padB
  const group = plotW / Math.max(series.length, 1)
  const barW = Math.min(22, group * 0.32)
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH
  const ticks = [0, 0.5, 1].map((f) => f * niceMax)
  const hasData = series.some((m) => m.invoiced > 0 || m.paid > 0)

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-navy">{title}</h2>
          <ul className="flex gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ backgroundColor: SERIES.invoiced }} />{labels.invoiced}</li>
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ backgroundColor: SERIES.paid }} />{labels.paid}</li>
          </ul>
        </div>
        {!hasData ? (
          <p className="mt-4 text-sm text-muted-foreground">No invoices in the last six months.</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label={`${title}, last ${series.length} months`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke={INK.grid} strokeWidth={1} />
                <text x={padL - 6} y={y(t) + 3} fontSize={10} textAnchor="end" fill={INK.muted}>{compact(t)}</text>
              </g>
            ))}
            {series.map((m, i) => {
              const cx = padL + group * i + group / 2
              const x1 = cx - barW - 1
              const x2 = cx + 1
              return (
                <g key={m.month}>
                  <title>{`${m.label}: ${labels.invoiced} ${money(m.invoiced)}, ${labels.paid} ${money(m.paid)}`}</title>
                  <rect x={x1} y={y(m.invoiced)} width={barW} height={Math.max(0, y(0) - y(m.invoiced))} rx={4} fill={SERIES.invoiced} />
                  <rect x={x2} y={y(m.paid)} width={barW} height={Math.max(0, y(0) - y(m.paid))} rx={4} fill={SERIES.paid} />
                  {/* square off the baseline so rounded ends only appear at the top */}
                  <rect x={x1} y={y(0) - 4} width={barW} height={Math.min(4, Math.max(0, y(0) - y(m.invoiced)))} fill={SERIES.invoiced} />
                  <rect x={x2} y={y(0) - 4} width={barW} height={Math.min(4, Math.max(0, y(0) - y(m.paid)))} fill={SERIES.paid} />
                  <text x={cx} y={H - 10} fontSize={11} textAnchor="middle" fill={INK.muted}>{m.label}</text>
                  {i === series.length - 1 ? (
                    <>
                      <text x={x1 + barW / 2} y={y(m.invoiced) - 4} fontSize={10} textAnchor="middle" fill={INK.primary}>{m.invoiced ? compact(m.invoiced) : ""}</text>
                      <text x={x2 + barW / 2} y={y(m.paid) - 4} fontSize={10} textAnchor="middle" fill={INK.primary}>{m.paid ? compact(m.paid) : ""}</text>
                    </>
                  ) : null}
                </g>
              )
            })}
            <line x1={padL} x2={W - 8} y1={y(0)} y2={y(0)} stroke={INK.muted} strokeWidth={1} />
          </svg>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Awarded vs actual $/gal per contract (dumbbell rows)
// ---------------------------------------------------------------------------
export function PriceVsAwarded({ rows }: { rows: { contract: string; awarded: number; actual: number }[] }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-navy">Invoiced $/gal vs awarded</h2>
          <ul className="flex gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2" style={{ borderColor: INK.muted }} />Awarded</li>
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ backgroundColor: SERIES.invoiced }} />Actual</li>
          </ul>
        </div>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No fuel lines invoiced yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rows.map((r) => {
              const lo = Math.min(r.awarded, r.actual) * 0.97
              const hi = Math.max(r.awarded, r.actual) * 1.03
              const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`
              const delta = r.actual - r.awarded
              const over = delta > 0.0005
              return (
                <li key={r.contract} title={`${r.contract}: awarded $${r.awarded.toFixed(4)}, actual $${r.actual.toFixed(4)}`}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{r.contract}</span>
                    <span className={cn("shrink-0 text-xs tabular-nums", over ? "text-red-700" : "text-emerald")}>
                      {over ? "+" : ""}{delta.toFixed(4)}/gal
                    </span>
                  </div>
                  <div className="relative mt-2 h-4">
                    <div className="absolute inset-y-0 left-0 right-0 my-auto h-px bg-border" />
                    <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-border" style={{ left: pos(Math.min(r.awarded, r.actual)), width: `calc(${pos(Math.max(r.awarded, r.actual))} - ${pos(Math.min(r.awarded, r.actual))})` }} />
                    <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-background" style={{ left: pos(r.awarded), borderColor: INK.muted }} />
                    <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background" style={{ left: pos(r.actual), backgroundColor: SERIES.invoiced }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
                    <span>awarded ${r.awarded.toFixed(4)}</span>
                    <span>actual ${r.actual.toFixed(4)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Single-series monthly bars (e.g. tons CO2e per month)
// ---------------------------------------------------------------------------
export function SingleBars({
  series,
  title,
  unit,
  color = SERIES.invoiced,
  format = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 }),
  empty = "No data yet.",
}: {
  series: { label: string; value: number }[]
  title: string
  unit: string
  color?: string
  format?: (v: number) => string
  empty?: string
}) {
  const W = 560
  const H = 200
  const padL = 44
  const padB = 28
  const padT = 14
  const max = Math.max(...series.map((m) => m.value), 1)
  const p = Math.pow(10, Math.floor(Math.log10(max)))
  const niceMax = Math.ceil(max / p) * p
  const plotW = W - padL - 8
  const plotH = H - padT - padB
  const group = plotW / Math.max(series.length, 1)
  const barW = Math.min(28, group * 0.5)
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH
  const hasData = series.some((m) => m.value > 0)
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-navy">{title}</h2>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {!hasData ? (
          <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label={title}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={padL} x2={W - 8} y1={y(f * niceMax)} y2={y(f * niceMax)} stroke={INK.grid} strokeWidth={1} />
                <text x={padL - 6} y={y(f * niceMax) + 3} fontSize={10} textAnchor="end" fill={INK.muted}>{format(f * niceMax)}</text>
              </g>
            ))}
            {series.map((m, i) => {
              const cx = padL + group * i + group / 2
              const x = cx - barW / 2
              const h = Math.max(0, y(0) - y(m.value))
              return (
                <g key={m.label + i}>
                  <title>{`${m.label}: ${format(m.value)} ${unit}`}</title>
                  <rect x={x} y={y(m.value)} width={barW} height={h} rx={4} fill={color} />
                  <rect x={x} y={y(0) - Math.min(4, h)} width={barW} height={Math.min(4, h)} fill={color} />
                  <text x={cx} y={H - 10} fontSize={11} textAnchor="middle" fill={INK.muted}>{m.label}</text>
                  {i === series.length - 1 && m.value > 0 ? (
                    <text x={cx} y={y(m.value) - 4} fontSize={10} textAnchor="middle" fill={INK.primary}>{format(m.value)}</text>
                  ) : null}
                </g>
              )
            })}
            <line x1={padL} x2={W - 8} y1={y(0)} y2={y(0)} stroke={INK.muted} strokeWidth={1} />
          </svg>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Progress against an annual target
// ---------------------------------------------------------------------------
export function TargetProgress({
  label,
  current,
  target,
  unit,
  format = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 }),
  children,
}: {
  label: string
  current: number
  target: number | null
  unit: string
  format?: (v: number) => string
  children?: React.ReactNode
}) {
  const pct = target && target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const over = target != null && target > 0 && current > target
  const yearFraction = (new Date().getUTCMonth() + 1) / 12
  const paceOk = target != null && target > 0 ? current <= target * yearFraction : true
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-navy">{label}</h2>
          {children}
        </div>
        {target == null ? (
          <p className="mt-3 text-sm text-muted-foreground">No target set for this year.</p>
        ) : (
          <>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-navy">{format(current)}</span>
              <span className="text-sm text-muted-foreground">of {format(target)} {unit}</span>
            </div>
            <div className="mt-3 h-2.5 w-full rounded-full bg-muted">
              <div className={cn("h-2.5 rounded-full", over ? "bg-red-600" : paceOk ? "bg-emerald" : "bg-amber-500")} style={{ width: `${pct}%` }} />
            </div>
            <p className={cn("mt-2 text-xs", over ? "text-red-700" : paceOk ? "text-emerald" : "text-amber-700")}>
              {over ? `Over target by ${format(current - target)} ${unit}` : paceOk ? `${pct}% used · on pace for the year` : `${pct}% used · ahead of pace`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
