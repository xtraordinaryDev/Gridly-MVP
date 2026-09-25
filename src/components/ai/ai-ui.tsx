"use client"

import { Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

/** Small label that marks AI-generated content. */
export function AiBadge({ className, children = "GridLink AI" }: { className?: string; children?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-blue/15 to-emerald/15 px-2 py-0.5 text-[11px] font-semibold text-navy ring-1 ring-brand-blue/20", className)}>
      <Sparkles className="size-3 text-brand-blue" />
      {children}
    </span>
  )
}

/** Gradient-bordered container for AI panels. */
export function AiPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl bg-gradient-to-r from-brand-blue/40 via-emerald/30 to-brand-blue/40 p-px", className)}>
      <div className="rounded-[15px] bg-card p-5">{children}</div>
    </div>
  )
}

/** Animated "thinking" state. */
export function AiThinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="relative flex size-6 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-blue/30" />
        <Sparkles className="relative size-4 text-brand-blue" />
      </span>
      <span className="animate-pulse">{label}</span>
    </div>
  )
}

export function FitBar({ value }: { value: number }) {
  const tone = value >= 80 ? "bg-emerald" : value >= 60 ? "bg-brand-blue" : value >= 40 ? "bg-amber-500" : "bg-muted-foreground/40"
  return (
    <span className="inline-flex items-center gap-2" title={`Fit ${value}/100`}>
      <span className="h-1.5 w-16 rounded-full bg-muted">
        <span className={cn("block h-1.5 rounded-full", tone)} style={{ width: `${Math.max(4, value)}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
    </span>
  )
}
