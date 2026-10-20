"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Building2,
  ClipboardList,
  Factory,
  Gauge,
  HardHat,
  Hospital,
  Landmark,
  Layers,
  Leaf,
  Plane,
  Receipt,
  Truck,
  Wheat,
  Zap,
} from "lucide-react"

import {
  BUYER_INDUSTRIES,
  BUYER_REQUEST_LIMITS as LIMITS,
  BUYER_VOLUME_RANGES,
  BuyerAccessRequestSchema,
  type BuyerAccessRequest,
} from "@/lib/schemas/buyer-access-request"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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
import { requestBuyerAccess } from "./actions"

type Industry = (typeof BUYER_INDUSTRIES)[number]
type Volume = (typeof BUYER_VOLUME_RANGES)[number]

const INDUSTRY_CHOICES: Choice<Industry>[] = [
  { value: "Logistics & Transportation", label: "Logistics & Transportation", icon: Truck },
  { value: "Construction", label: "Construction", icon: HardHat },
  { value: "Food & Agriculture", label: "Food & Agriculture", icon: Wheat },
  { value: "Manufacturing", label: "Manufacturing", icon: Factory },
  { value: "Aviation / Airport", label: "Aviation / Airport", icon: Plane },
  { value: "Government / Public Sector", label: "Government / Public Sector", icon: Landmark },
  { value: "Utilities", label: "Utilities", icon: Zap },
  { value: "Healthcare / Hospital", label: "Healthcare / Hospital", icon: Hospital },
  { value: "Other", label: "Something else", icon: Building2 },
]

const VOLUME_CHOICES: Choice<Volume>[] = BUYER_VOLUME_RANGES.map((v, i) => ({
  value: v,
  label: v.replace(" gal/yr", ""),
  hint: "gallons a year",
  glyph: <Drops n={i + 1} />,
}))

const NEEDS = [
  { value: "Competitive bids on fuel contracts", label: "Competitive bids on contracts", icon: ClipboardList },
  { value: "Spot and emergency deliveries", label: "Spot and emergency deliveries", icon: Truck },
  { value: "Consolidating multiple suppliers", label: "Consolidate my suppliers", icon: Layers },
  { value: "Delivery tickets and invoice tracking", label: "Delivery and invoice tracking", icon: Receipt },
  { value: "Price benchmarks", label: "Know if I'm paying too much", icon: Gauge },
  { value: "Emissions reporting", label: "Emissions reporting", icon: Leaf },
] as const
type Need = (typeof NEEDS)[number]["value"]

const STEPS = ["industry", "volume", "needs", "contact"] as const

export function SignupForm({ preview }: { preview: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(0)
  const [needs, setNeeds] = useState<Need[]>([])
  const [details, setDetails] = useState("")
  const bot = useBotCheck()

  const form = useForm<BuyerAccessRequest>({
    resolver: zodResolver(BuyerAccessRequestSchema),
    defaultValues: {
      fullName: "",
      companyName: "",
      email: "",
      phone: "",
      industry: undefined,
      estimatedVolume: undefined,
      useCase: "",
    },
  })

  const industry = useWatch({ control: form.control, name: "industry" })
  const volume = useWatch({ control: form.control, name: "estimatedVolume" })

  // The server expects one free-text "use case"; compose it from the picks plus any detail.
  function composeUseCase() {
    const parts = []
    if (needs.length) parts.push(`Needs: ${needs.join("; ")}.`)
    if (details.trim()) parts.push(details.trim())
    return parts.join("\n")
  }

  const canContinue =
    step === 0 ? Boolean(industry) : step === 1 ? Boolean(volume) : step === 2 ? needs.length > 0 || details.trim().length >= 10 : true

  function next() {
    if (step === 2) form.setValue("useCase", composeUseCase(), { shouldValidate: false })
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function onSubmit(values: BuyerAccessRequest) {
    startTransition(async () => {
      const res = await requestBuyerAccess({ ...values, useCase: composeUseCase() }, bot.meta())
      if (res.ok) router.push("/signup/submitted")
      else toast.error(res.message)
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, () => {
          // A validation miss on the last step is always a contact field; stay there.
          setStep(3)
        })}
        className="relative space-y-8"
      >
        {bot.field}
        <StepProgress count={STEPS.length} current={step} />

        {step === 0 ? (
          <StepPanel stepKey="industry" className="space-y-8">
            <StepHeading title="What kind of organization buys the fuel?" />
            <ChoiceCards
              choices={INDUSTRY_CHOICES}
              value={industry}
              onChange={(v) => {
                form.setValue("industry", v as Industry, { shouldValidate: true })
                setTimeout(next, 260)
              }}
              columns={3}
            />
            <StepNav onNext={next} nextDisabled={!canContinue} />
          </StepPanel>
        ) : null}

        {step === 1 ? (
          <StepPanel stepKey="volume" className="space-y-8">
            <StepHeading title="How much fuel do you buy in a year?" help="Across every site, fleet and tank. A rough estimate is fine." />
            <ChoiceCards
              choices={VOLUME_CHOICES}
              value={volume}
              onChange={(v) => {
                form.setValue("estimatedVolume", v as Volume, { shouldValidate: true })
                setTimeout(next, 260)
              }}
              columns={5}
            />
            <StepNav onBack={back} onNext={next} nextDisabled={!canContinue} />
          </StepPanel>
        ) : null}

        {step === 2 ? (
          <StepPanel stepKey="needs" className="space-y-8">
            <StepHeading title="What do you want GridLink to fix first?" help="Pick everything that applies." />
            <ChoiceCards
              choices={NEEDS}
              value={needs}
              onChange={(v) => setNeeds(v as Need[])}
              columns={3}
            />
            <div className="mx-auto max-w-xl">
              <label htmlFor="signup-details" className="text-sm font-medium text-navy">
                Anything else we should know? <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="signup-details"
                rows={3}
                className="mt-2"
                placeholder="Sites, fleet size, current suppliers, contract dates…"
                maxLength={LIMITS.useCase - 400}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
            <StepNav onBack={back} onNext={next} nextDisabled={!canContinue} />
          </StepPanel>
        ) : null}

        {step === 3 ? (
          <StepPanel stepKey="contact" className="space-y-8">
            <StepHeading title="Where should we send your access link?" help="Our team reviews every request and emails approved buyers a link to create their account." />
            <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jordan Kim" autoComplete="name" maxLength={LIMITS.fullName} autoFocus {...field} />
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
                    <FormLabel>Company / organization</FormLabel>
                    <FormControl>
                      <Input placeholder="Metro Transit Authority" autoComplete="organization" maxLength={LIMITS.companyName} {...field} />
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
                    <FormLabel>Work email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@company.com" autoComplete="email" maxLength={LIMITS.email} {...field} />
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
            <StepNav onBack={back} onNext={next} isLast pending={isPending} submitLabel="Request access" />
            {preview ? (
              <p className="text-center text-xs text-muted-foreground">Preview mode — submitting shows the confirmation page.</p>
            ) : null}
          </StepPanel>
        ) : null}

        <div className="space-y-1 text-center text-xs text-muted-foreground">
          <p>
            Step {step + 1} of {STEPS.length}
            {" · "}
            Fuel suppliers apply via{" "}
            <Link href="/become-a-supplier" className="text-brand-blue hover:underline">
              Become a Supplier
            </Link>
            .
          </p>
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-blue hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </Form>
  )
}
