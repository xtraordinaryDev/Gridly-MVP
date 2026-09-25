"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { CheckCheck, RefreshCw, Sparkles } from "lucide-react"

import type { DirectoryVendor } from "@/lib/directory/shared"
import { rankSuppliers, type RankedSupplier } from "@/app/ai/actions"
import { AiBadge, AiPanel, AiThinking, FitBar } from "@/components/ai/ai-ui"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface RfpSnapshot {
  title: string
  description: string
  fuelType: string
  quantityGallons: number
  urgency: string
  pricingMode: string
  states: string[]
  capabilities: string[]
  certifications: string[]
}

export function SupplierSuggestions({
  snapshot,
  candidates,
  selectedIds,
  onSelectionChange,
}: {
  snapshot: RfpSnapshot
  candidates: DirectoryVendor[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ summary: string; ranked: RankedSupplier[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastKey = useRef<string>("")
  const key = candidates.map((c) => c.id).sort().join(",") + "|" + snapshot.states.join(",") + "|" + snapshot.capabilities.join(",") + "|" + snapshot.certifications.join(",")

  function run(apply: boolean) {
    if (!candidates.length) return
    lastKey.current = key
    setError(null)
    startTransition(async () => {
      const res = await rankSuppliers({ ...snapshot, candidateIds: candidates.map((c) => c.id).slice(0, 40) })
      if (res.ok) {
        setResult(res.data)
        if (apply) {
          const rec = res.data.ranked.filter((r) => r.recommended).map((r) => r.vendorId)
          if (rec.length) onSelectionChange(rec)
        }
      } else {
        setResult(null)
        setError(res.message)
      }
    })
  }

  // Rank automatically the first time this set of candidates is shown.
  useEffect(() => {
    if (key !== lastKey.current && candidates.length) run(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const toggle = (id: string, on: boolean) => onSelectionChange(on ? [...selectedIds, id] : selectedIds.filter((x) => x !== id))

  if (!candidates.length) {
    return <p className="text-sm text-muted-foreground">No verified suppliers match the states and requirements yet. Adjust the delivery states or switch to choosing suppliers manually.</p>
  }

  return (
    <AiPanel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand-blue" />
          <h3 className="text-sm font-semibold text-navy">Suggested suppliers</h3>
          <AiBadge />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{selectedIds.length} of {candidates.length} selected</span>
          <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => run(false)} className="gap-1 text-muted-foreground">
            <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
            Re-rank
          </Button>
        </div>
      </div>

      {isPending && !result ? (
        <div className="mt-4 space-y-3">
          <AiThinking label={`Analyzing ${candidates.length} verified suppliers against your RFP…`} />
          {candidates.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="size-4 rounded bg-muted" />
              <span className="h-3 w-40 animate-pulse rounded bg-muted" />
              <span className="h-3 flex-1 animate-pulse rounded bg-muted/70" />
            </div>
          ))}
        </div>
      ) : result ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{result.summary}</p>
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            {result.ranked.map((r, i) => {
              const on = selectedIds.includes(r.vendorId)
              return (
                <li key={r.vendorId} className={cn("flex items-start gap-3 rounded-xl border p-3 transition-colors", on ? "border-brand-blue/40 bg-brand-blue/5" : "border-border")}>
                  <Checkbox checked={on} onCheckedChange={(v) => toggle(r.vendorId, !!v)} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">#{i + 1}</span>
                      <span className="font-medium text-navy">{r.companyName}</span>
                      {r.recommended ? <span className="rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald">Recommended</span> : null}
                      <FitBar value={r.fit} />
                    </div>
                    <p className="mt-1 text-sm text-foreground/80">{r.reason}</p>
                    {r.tags.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {r.tags.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>)}
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Ranked on coverage, capabilities, scale, and track record. You choose who gets invited.</span>
            <Button type="button" size="sm" variant="outline" onClick={() => onSelectionChange(result.ranked.filter((r) => r.recommended).map((r) => r.vendorId))} className="gap-1.5">
              <CheckCheck className="size-3.5" />
              Select recommended
            </Button>
          </div>
        </>
      ) : (
        <>
          {error ? <p className="mt-2 text-xs text-amber-700">{error} Showing the matched list instead.</p> : null}
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {candidates.map((v) => (
              <li key={v.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selectedIds.includes(v.id)} onCheckedChange={(on) => toggle(v.id, !!on)} />
                <span className="font-medium text-navy">{v.companyName}</span>
                <span className="text-xs text-muted-foreground">{v.states.slice(0, 3).join(", ")}{v.states.length > 3 ? ` +${v.states.length - 3}` : ""}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </AiPanel>
  )
}
