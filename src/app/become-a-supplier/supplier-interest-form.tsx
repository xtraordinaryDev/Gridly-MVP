"use client"

import { useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Check, CircleDashed, Flame, FlaskConical, Fuel, Leaf, Plane, Truck } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  SupplierInterestSchema,
  type SupplierInterest,
  INTEREST_PRODUCTS,
  ANNUAL_GALLONS_RANGES,
  SUPPLIER_INTEREST_LIMITS as LIMITS,
} from "@/lib/schemas/supplier-interest"
import { US_STATES } from "@/lib/schemas/vendor-application"
import { useBotCheck } from "@/components/marketing/bot-check"
import {
  ChoiceCards,
  Drops,
  StepHeading,
  StepNav,
  StepPanel,
  StepProgress,
  type Choice,
} from "@/components/marketing/step-wizard"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { submitSupplierInterest } from "./actions"

type Product = (typeof INTEREST_PRODUCTS)[number]
type Gallons = (typeof ANNUAL_GALLONS_RANGES)[number]
type State = (typeof US_STATES)[number]

const PRODUCT_CHOICES: Choice<Product>[] = [
  { value: "Diesel", label: "Diesel", icon: Truck },
  { value: "Gas", label: "Gasoline", icon: Fuel },
  { value: "DEF", label: "DEF", icon: FlaskConical },
  { value: "Jet Fuel", label: "Jet fuel", icon: Plane },
  { value: "Propane", label: "Propane", icon: Flame },
  { value: "Renewable", label: "Renewable", icon: Leaf },
  { value: "Other", label: "Other", icon: CircleDashed },
]

const GALLONS_CHOICES: Choice<Gallons>[] = ANNUAL_GALLONS_RANGES.map((r, i) => ({
  value: r,
  label: r.replace("M", "M").replace("<1M", "Under 1M"),
  hint: "gallons a year",
  glyph: <Drops n={i + 1} />,
}))

const REGIONS: Record<string, State[]> = {
  Northeast: ["Connecticut", "Maine", "Massachusetts", "New Hampshire", "New Jersey", "New York", "Pennsylvania", "Rhode Island", "Vermont"],
  Southeast: ["Alabama", "Arkansas", "Delaware", "Florida", "Georgia", "Kentucky", "Louisiana", "Maryland", "Mississippi", "North Carolina", "South Carolina", "Tennessee", "Virginia", "West Virginia"],
  Midwest: ["Illinois", "Indiana", "Iowa", "Kansas", "Michigan", "Minnesota", "Missouri", "Nebraska", "North Dakota", "Ohio", "South Dakota", "Wisconsin"],
  Southwest: ["Arizona", "New Mexico", "Oklahoma", "Texas"],
  West: ["Alaska", "California", "Colorado", "Hawaii", "Idaho", "Montana", "Nevada", "Oregon", "Utah", "Washington", "Wyoming"],
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-brand-blue bg-brand-blue text-brand-blue-foreground"
          : "border-border bg-background text-muted-foreground hover:border-brand-blue/40 hover:text-navy"
      )}
    >
      {active ? <Check className="size-3.5" /> : null}
      {label}
    </button>
  )
}

const STEPS = ["products", "volume", "states", "company", "contact"] as const

export function SupplierInterestForm() {
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(0)
  const bot = useBotCheck()

  const form = useForm<SupplierInterest>({
    resolver: zodResolver(SupplierInterestSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      website: "",
      statesServed: [],
      productsOffered: [],
      annualGallons: undefined,
      description: "",
    },
  })

  const products = useWatch({ control: form.control, name: "productsOffered" })
  const gallons = useWatch({ control: form.control, name: "annualGallons" })
  const states = useWatch({ control: form.control, name: "statesServed" })

  const canContinue =
    step === 0 ? products.length > 0 : step === 1 ? Boolean(gallons) : step === 2 ? states.length > 0 : true

  // Fields validated before leaving each step, so a miss shows on the screen it belongs to.
  const STEP_FIELDS: (keyof SupplierInterest)[][] = [
    ["productsOffered"],
    ["annualGallons"],
    ["statesServed"],
    ["companyName", "website", "description"],
    ["contactName", "email", "phone"],
  ]

  async function next() {
    const ok = await form.trigger(STEP_FIELDS[step])
    if (!ok) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function toggleRegion(list: State[], region: State[]) {
    const all = region.every((s) => list.includes(s))
    if (all) return list.filter((s) => !region.includes(s))
    return [...list, ...region.filter((s) => !list.includes(s))]
  }

  function onSubmit(values: SupplierInterest) {
    startTransition(async () => {
      const result = await submitSupplierInterest(values, bot.meta())
      if (result.ok) setSubmitted(true)
      else toast.error(result.message)
    })
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald/15 text-emerald">
          <Check className="size-7" />
        </span>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-navy">Thank you for your interest.</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          The GridLink team will review your submission and reach out within 3–5 business days with onboarding next steps.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          // Jump back to the first step that still has an error.
          const i = STEP_FIELDS.findIndex((fields) => fields.some((f) => f in errors))
          if (i >= 0) setStep(i)
        })}
        className="relative space-y-8 rounded-3xl border border-border bg-card/60 p-6 shadow-sm sm:p-10"
      >
        {bot.field}
        <StepProgress count={STEPS.length} current={step} />

        {step === 0 ? (
          <StepPanel stepKey="products" className="space-y-8">
            <StepHeading title="What do you supply?" help="Pick everything you deliver today." />
            <ChoiceCards
              choices={PRODUCT_CHOICES}
              value={products}
              onChange={(v) => form.setValue("productsOffered", v as Product[], { shouldValidate: true })}
              columns={4}
            />
            <StepNav onNext={next} nextDisabled={!canContinue} />
          </StepPanel>
        ) : null}

        {step === 1 ? (
          <StepPanel stepKey="volume" className="space-y-8">
            <StepHeading title="How many gallons do you distribute a year?" help="All products, all customers. A rough estimate is fine." />
            <ChoiceCards
              choices={GALLONS_CHOICES}
              value={gallons}
              onChange={(v) => {
                form.setValue("annualGallons", v as Gallons, { shouldValidate: true })
                setTimeout(() => setStep(2), 260)
              }}
              columns={5}
            />
            <StepNav onBack={back} onNext={next} nextDisabled={!canContinue} />
          </StepPanel>
        ) : null}

        {step === 2 ? (
          <StepPanel stepKey="states" className="space-y-8">
            <StepHeading title="Where do you deliver?" help="Tap a region to select it in one go, then fine-tune by state." />
            <FormField
              control={form.control}
              name="statesServed"
              render={({ field }) => (
                <FormItem className="mx-auto max-w-3xl">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {Object.entries(REGIONS).map(([name, list]) => {
                      const all = list.every((s) => field.value.includes(s))
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={all}
                          onClick={() => field.onChange(toggleRegion(field.value, list))}
                          className={cn(
                            "rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors",
                            all ? "border-brand-blue bg-brand-blue/5 text-navy" : "border-transparent bg-card text-muted-foreground shadow-sm hover:border-brand-blue/40 hover:text-navy"
                          )}
                        >
                          {name}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      className="rounded-xl px-3 py-2 text-sm font-medium text-brand-blue hover:underline"
                      onClick={() => field.onChange(field.value.length === US_STATES.length ? [] : [...US_STATES])}
                    >
                      {field.value.length === US_STATES.length ? "Clear all" : "All 50 states"}
                    </button>
                  </div>
                  <div className="mt-4 flex max-h-64 flex-wrap justify-center gap-2 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3">
                    {US_STATES.map((state) => (
                      <Chip
                        key={state}
                        label={state}
                        active={field.value.includes(state)}
                        onClick={() =>
                          field.onChange(field.value.includes(state) ? field.value.filter((s) => s !== state) : [...field.value, state])
                        }
                      />
                    ))}
                  </div>
                  <p className="text-center text-xs text-muted-foreground">{field.value.length} selected</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <StepNav onBack={back} onNext={next} nextDisabled={!canContinue} />
          </StepPanel>
        ) : null}

        {step === 3 ? (
          <StepPanel stepKey="company" className="space-y-8">
            <StepHeading title="Tell us about your company." help="Buyers see this once you are verified." />
            <div className="mx-auto grid max-w-xl gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Fuel Co." autoComplete="organization" maxLength={LIMITS.companyName} autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Website <span className="font-normal text-muted-foreground">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="url" inputMode="url" placeholder="https://acmefuel.com" maxLength={LIMITS.website} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Operations, coverage area, fleet, and what makes you a strong supplier."
                        maxLength={LIMITS.description}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <StepNav onBack={back} onNext={next} />
          </StepPanel>
        ) : null}

        {step === 4 ? (
          <StepPanel stepKey="contact" className="space-y-8">
            <StepHeading title="Who should we talk to?" help="We review every application and reply within 3–5 business days with a secure link to finish verification." />
            <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Contact name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jordan Rivera" autoComplete="name" maxLength={LIMITS.contactName} autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jordan@acmefuel.com" autoComplete="email" maxLength={LIMITS.email} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="(555) 123-4567" autoComplete="tel" maxLength={LIMITS.phone} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <StepNav onBack={back} onNext={next} isLast pending={isPending} submitLabel="Submit application" />
          </StepPanel>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
      </form>
    </Form>
  )
}
