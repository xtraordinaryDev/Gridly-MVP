"use client"

import { useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Check, CircleDashed, Flame, FlaskConical, Fuel, Leaf, Plane, Truck } from "lucide-react"

import {
  SupplierInterestSchema,
  type SupplierInterest,
  INTEREST_PRODUCTS,
  ANNUAL_GALLONS_RANGES,
  SUPPLIER_INTEREST_LIMITS as LIMITS,
} from "@/lib/schemas/supplier-interest"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { submitSupplierInterest } from "./actions"

type Product = (typeof INTEREST_PRODUCTS)[number]
type Gallons = (typeof ANNUAL_GALLONS_RANGES)[number]

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
  label: r === "<1M" ? "Under 1M" : r,
  hint: "gallons a year",
  glyph: <Drops n={i + 1} />,
}))

const STEPS = ["products", "volume", "contact"] as const

// Fields validated before leaving each step, so a miss shows on the screen it belongs to.
const STEP_FIELDS: (keyof SupplierInterest)[][] = [
  ["productsOffered"],
  ["annualGallons"],
  ["companyName", "contactName", "email", "phone"],
]

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
      productsOffered: [],
      annualGallons: undefined,
    },
  })

  const products = useWatch({ control: form.control, name: "productsOffered" })
  const gallons = useWatch({ control: form.control, name: "annualGallons" })

  const canContinue = step === 0 ? products.length > 0 : step === 1 ? Boolean(gallons) : true

  async function next() {
    const ok = await form.trigger(STEP_FIELDS[step])
    if (!ok) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0))
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
          <StepPanel stepKey="contact" className="space-y-8">
            <StepHeading title="Who should we talk to?" help="We review every application and reply within 3–5 business days with a secure link to finish verification." />
            <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
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
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Fuel Co." autoComplete="organization" maxLength={LIMITS.companyName} {...field} />
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
