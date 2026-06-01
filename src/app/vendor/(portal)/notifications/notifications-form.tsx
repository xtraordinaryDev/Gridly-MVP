"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CalendarClock, Loader2, Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import type { NotificationPrefs } from "@/lib/data/vendor"
import { PRODUCTS_OFFERED, US_STATES } from "@/lib/schemas/vendor-application"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveNotificationPrefs } from "./actions"

const FREQUENCIES = [
  { value: "daily", label: "Daily", hint: "One digest each morning" },
  { value: "weekly", label: "Weekly", hint: "A summary every Monday" },
  { value: "never", label: "Never", hint: "No opportunity emails" },
] as const

function Chips({
  options,
  value,
  onChange,
}: {
  options: readonly string[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(option: string) {
    onChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option]
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                : "border-border bg-background text-muted-foreground hover:border-brand-blue/40"
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </div>
  )
}

export function NotificationsForm({
  vendorId,
  initial,
  licensedStates,
  preview,
}: {
  vendorId: string
  initial: NotificationPrefs
  licensedStates: string[]
  preview: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [frequency, setFrequency] = useState(initial.emailFrequency)
  const [fuelTypes, setFuelTypes] = useState<string[]>(initial.fuelTypes)
  const [states, setStates] = useState<string[]>(initial.states)
  const [minGallons, setMinGallons] = useState<string>(String(initial.minGallons))
  const [emergency, setEmergency] = useState(initial.emergencyImmediate)

  const allLicensedSelected =
    licensedStates.length > 0 &&
    licensedStates.every((s) => states.includes(s))

  function onSave() {
    startTransition(async () => {
      const res = await saveNotificationPrefs(vendorId, {
        emailFrequency: frequency,
        fuelTypes,
        states,
        minGallons: Number(minGallons.replace(/,/g, "")) || 0,
        emergencyImmediate: emergency,
      })
      if (res.ok) {
        toast.success(
          preview
            ? "Saved (preview) — preferences aren't persisted."
            : "Notification preferences saved."
        )
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      <Section
        title="Email frequency"
        description="How often should we send the opportunity digest?"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {FREQUENCIES.map((f) => {
            const active = frequency === f.value
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFrequency(f.value)}
                className={cn(
                  "flex flex-col items-start rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue"
                    : "border-border hover:border-brand-blue/40"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <CalendarClock className="size-4" />
                  {f.label}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">{f.hint}</span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section
        title="Fuel types of interest"
        description="We'll prioritize RFPs for these products."
      >
        <Chips options={PRODUCTS_OFFERED} value={fuelTypes} onChange={setFuelTypes} />
      </Section>

      <Section
        title="States of interest"
        description="Choose where you want to see opportunities."
      >
        <div className="mb-3">
          <button
            type="button"
            onClick={() =>
              setStates(allLicensedSelected ? [] : [...new Set(licensedStates)])
            }
            className="rounded-lg border border-brand-blue/40 bg-brand-blue/5 px-3 py-1.5 text-sm font-medium text-brand-blue transition-colors hover:bg-brand-blue/10"
          >
            {allLicensedSelected
              ? "Clear all states"
              : "All states I'm licensed in"}
          </button>
        </div>
        <Chips options={US_STATES} value={states} onChange={setStates} />
      </Section>

      <Section
        title="Minimum gallons threshold"
        description="Only notify me about RFPs at or above this quantity."
      >
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            value={minGallons}
            onChange={(e) => setMinGallons(e.target.value)}
            className="max-w-40"
          />
          <span className="text-sm text-muted-foreground">gallons</span>
        </div>
      </Section>

      <Section title="Emergency & rush RFPs">
        <button
          type="button"
          onClick={() => setEmergency((v) => !v)}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <span className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Zap className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">
                Email me immediately for emergency/rush RFPs
              </span>
              <span className="block text-xs text-muted-foreground">
                Bypasses your digest cadence when a matching urgent RFP is posted.
              </span>
            </span>
          </span>
          <span
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
              emergency ? "bg-emerald" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
                emergency ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </span>
        </button>
      </Section>

      <div className="flex justify-end">
        <Button type="button" size="lg" onClick={onSave} disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save preferences
        </Button>
      </div>
    </div>
  )
}
