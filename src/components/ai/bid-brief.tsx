"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Handshake, RefreshCw, Sparkles, ThumbsUp } from "lucide-react"

import type { BidBrief } from "@/lib/ai/schemas"
import { generateBidBrief } from "@/app/ai/actions"
import { AiBadge, AiPanel, AiThinking } from "@/components/ai/ai-ui"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const VERDICT: Record<BidBrief["comparison"][number]["verdict"], { label: string; cls: string }> = {
  recommended: { label: "Recommended", cls: "bg-emerald/15 text-emerald" },
  strong_alternative: { label: "Strong alternative", cls: "bg-brand-blue/10 text-brand-blue" },
  consider: { label: "Consider", cls: "bg-amber-100 text-amber-800" },
  pass: { label: "Pass", cls: "bg-muted text-muted-foreground" },
}

export function BidBriefPanel({ rfpId, initial, responseCount }: { rfpId: string; initial: { brief: BidBrief; generatedAt: string } | null; responseCount: number }) {
  const router = useRouter()
  const [state, setState] = useState(initial)
  const [isPending, startTransition] = useTransition()

  const run = () =>
    startTransition(async () => {
      const res = await generateBidBrief(rfpId)
      if (res.ok) {
        setState(res.data)
        router.refresh()
      } else toast.error(res.message)
    })

  if (responseCount === 0) return null

  return (
    <AiPanel className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand-blue" />
          <h3 className="text-sm font-semibold text-navy">Bid comparison brief</h3>
          <AiBadge />
        </div>
        <div className="flex items-center gap-2">
          {state ? <span className="text-xs text-muted-foreground" suppressHydrationWarning>Generated {new Date(state.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC</span> : null}
          <Button type="button" size="sm" variant={state ? "ghost" : "default"} disabled={isPending} onClick={run} className="gap-1.5">
            {state ? <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} /> : <Sparkles className="size-3.5" />}
            {state ? "Regenerate" : `Analyze ${responseCount} bid${responseCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>

      {isPending && !state ? (
        <div className="mt-4"><AiThinking label="Comparing pricing, terms, and delivery track records…" /></div>
      ) : state ? (
        <div className="mt-4 space-y-4">
          <p className="text-base font-medium text-navy">{state.brief.headline}</p>
          <div className="rounded-xl border border-emerald/30 bg-emerald/5 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald"><ThumbsUp className="size-3.5" />Recommendation: {state.brief.recommendation.vendorName}</p>
            <p className="mt-1 text-sm">{state.brief.recommendation.why}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {state.brief.comparison.map((c) => (
              <div key={c.vendorId} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-navy">{c.vendorName}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", VERDICT[c.verdict].cls)}>{VERDICT[c.verdict].label}</span>
                </div>
                {c.strengths.length ? <ul className="mt-2 space-y-0.5 text-xs text-foreground/80">{c.strengths.map((s) => <li key={s}>+ {s}</li>)}</ul> : null}
                {c.concerns.length ? <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{c.concerns.map((s) => <li key={s}>− {s}</li>)}</ul> : null}
              </div>
            ))}
          </div>
          {state.brief.risks.length ? (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700"><AlertTriangle className="size-3.5" />Watch out for</p>
              <ul className="mt-1 space-y-0.5 text-sm">{state.brief.risks.map((r) => <li key={r}>· {r}</li>)}</ul>
            </div>
          ) : null}
          {state.brief.negotiation.length ? (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy"><Handshake className="size-3.5" />Before you award</p>
              <ul className="mt-1 space-y-0.5 text-sm">{state.brief.negotiation.map((r) => <li key={r}>· {r}</li>)}</ul>
            </div>
          ) : null}
          <p className="text-[11px] text-muted-foreground">AI-generated from the bids and supplier history on GridLink. Verify numbers before awarding.</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Get a plain-English read on the bids: who&apos;s cheapest, who&apos;s safest, and what to negotiate before awarding.</p>
      )}
    </AiPanel>
  )
}
