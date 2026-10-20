"use client"

import { type ComponentType, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/* Shared building blocks for the Procore-style, one-question-per-screen
 * sign-up flows (/signup and /become-a-supplier). */

/** Segmented progress line: one bar per step, filled through the current one. */
export function StepProgress({ count, current }: { count: number; current: number }) {
  return (
    <div className="mx-auto flex w-full max-w-lg gap-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-border">
          <span
            className={cn(
              "block h-full origin-left rounded-full bg-brand-blue transition-transform duration-500 ease-out",
              i <= current ? "scale-x-100" : "scale-x-0"
            )}
          />
        </span>
      ))}
    </div>
  )
}

/** Question heading with an optional helper line. */
export function StepHeading({ title, help }: { title: string; help?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-balance text-xl font-bold tracking-tight text-navy sm:text-2xl">{title}</h2>
      {help ? <p className="mt-2 text-sm text-muted-foreground">{help}</p> : null}
    </div>
  )
}

/** A frame that re-animates its contents whenever `stepKey` changes. */
export function StepPanel({ stepKey, children, className }: { stepKey: string | number; children: ReactNode; className?: string }) {
  return (
    <div key={stepKey} className={cn("animate-in fade-in slide-in-from-right-4 duration-300 motion-reduce:animate-none", className)}>
      {children}
    </div>
  )
}

export type Choice<T extends string> = {
  value: T
  label: string
  hint?: string
  icon?: ComponentType<{ className?: string }>
  /** Rendered instead of `icon` when given, e.g. a row of droplets. */
  glyph?: ReactNode
}

/** Grid of large tap targets. Single-select when `value` is a string, multi when it is an array. */
export function ChoiceCards<T extends string>({
  choices,
  value,
  onChange,
  columns = 4,
}: {
  choices: readonly Choice<T>[]
  value: T | T[] | undefined
  onChange: (next: T | T[]) => void
  columns?: 3 | 4 | 5
}) {
  const multi = Array.isArray(value)
  const selected = (v: T) => (multi ? (value as T[]).includes(v) : value === v)
  const cols = columns === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"

  return (
    <div role={multi ? "group" : "radiogroup"} className={cn("grid grid-cols-2 gap-3", cols)}>
      {choices.map((c) => {
        const on = selected(c.value)
        const Icon = c.icon
        return (
          <button
            key={c.value}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => {
              if (multi) {
                const list = value as T[]
                onChange(list.includes(c.value) ? list.filter((x) => x !== c.value) : [...list, c.value])
              } else {
                onChange(c.value)
              }
            }}
            className={cn(
              "group relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-card px-3 py-5 text-center shadow-sm transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-brand-blue/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40",
              on ? "border-brand-blue bg-brand-blue/5 shadow-md" : "border-transparent"
            )}
          >
            {on ? (
              <span className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-brand-blue text-white animate-in zoom-in-50 duration-200">
                <Check className="size-3" />
              </span>
            ) : null}
            {c.glyph ? (
              <span className={cn("text-brand-blue transition-transform duration-200 group-hover:scale-110", on && "scale-110")}>{c.glyph}</span>
            ) : Icon ? (
              <Icon className={cn("size-8 text-brand-blue transition-transform duration-200 group-hover:scale-110", on && "scale-110")} />
            ) : null}
            <span className="text-sm font-semibold leading-tight text-navy">{c.label}</span>
            {c.hint ? <span className="text-xs text-muted-foreground">{c.hint}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

/** Back / Next (or submit) row. */
export function StepNav({
  onBack,
  onNext,
  nextDisabled,
  isLast,
  pending,
  submitLabel = "Submit",
}: {
  onBack?: () => void
  onNext: () => void
  nextDisabled?: boolean
  isLast?: boolean
  pending?: boolean
  submitLabel?: string
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {onBack ? (
        <Button type="button" variant="outline" size="lg" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" /> Back
        </Button>
      ) : null}
      <Button type={isLast ? "submit" : "button"} size="lg" onClick={isLast ? undefined : onNext} disabled={nextDisabled || pending} className="gap-2 min-w-32">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isLast ? submitLabel : "Next"}
        {!pending && !isLast ? <ArrowRight className="size-4" /> : null}
      </Button>
    </div>
  )
}

/** A row of 1–5 droplets, the fuel equivalent of Procore's $ signs. */
export function Drops({ n, of = 5 }: { n: number; of?: number }) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={cn("size-5", i < n ? "fill-brand-blue" : "fill-border")}>
          <path d="M12 2.5c-3.4 4.6-7 8.4-7 12.3A7 7 0 0 0 19 14.8c0-3.9-3.6-7.7-7-12.3Z" />
        </svg>
      ))}
    </span>
  )
}
