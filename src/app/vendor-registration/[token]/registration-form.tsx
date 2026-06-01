"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  useForm,
  type Control,
  type FieldPath,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  VendorRegistrationSchema,
  type VendorRegistration,
  ENTITY_TYPES,
  ORGANIZATION_TYPES,
  SPECIAL_CERTIFICATIONS,
  OPERATING_HOURS,
  PRICING_BASIS,
  PRODUCT_CATEGORIES,
  EMERGENCY_RETAINER_OPTIONS,
  DELIVERY_CAPABILITIES,
  ADDITIONAL_SERVICES,
  US_STATES,
} from "@/lib/schemas/vendor-application"
import { submitVendorRegistration } from "./actions"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { FileUploadField } from "@/components/file-upload-field"

type Ctrl = Control<VendorRegistration>
type Name = FieldPath<VendorRegistration>

const STEPS: { id: string; title: string; fields: Name[] }[] = [
  {
    id: "company",
    title: "Company",
    fields: [
      "companyName",
      "corporateAddress",
      "stateOfIncorporation",
      "entityType",
      "organizationType",
      "specialCertification",
      "nationwide",
      "usDotNumber",
      "websiteUrl",
      "yearFounded",
    ],
  },
  {
    id: "documents",
    title: "Documents",
    fields: ["w9Form", "certificateOfInsurance", "distributorLicense", "companyLogo"],
  },
  {
    id: "contacts",
    title: "Contacts",
    fields: [
      "salesRepFirstName",
      "salesRepLastName",
      "salesRepEmail",
      "salesRepPhone",
      "dispatchContactName",
      "dispatchPhone",
      "dispatchEmail",
      "emergencyDispatchName",
      "emergencyDispatchPhone",
      "emergencyDispatchEmail",
    ],
  },
  {
    id: "billing",
    title: "Billing",
    fields: [
      "billingAddress",
      "billingContactName",
      "billingEmail",
      "billingPhone",
      "deliveryContactInfo",
      "billingSystem",
    ],
  },
  {
    id: "operations",
    title: "Operations",
    fields: [
      "operatingHours",
      "terminalsAvailable",
      "pricingBasis",
      "pricingBasisOther",
      "areasOwnedTrucks",
      "areasSubcontracted",
      "tankwagonsCount",
      "transportsCount",
      "annualGallonsDistributed",
      "standardOrderLeadTime",
      "emergencyRetainerWilling",
      "emergencyOrderLeadTime",
      "emergencyResponseTimes",
    ],
  },
  {
    id: "products",
    title: "Products",
    fields: ["productsOffered", "brandsOffered"],
  },
  {
    id: "capabilities",
    title: "Capabilities",
    fields: [
      "deliveryCapabilities",
      "additionalServices",
      "otherServices",
      "wetHoseTicketType",
      "telematicsSystem",
      "dispatchSoftware",
    ],
  },
  { id: "states", title: "Licensed States", fields: ["licensedStates"] },
  { id: "review", title: "Review", fields: [] },
]

function buildDefaults(
  initial?: Partial<VendorRegistration>
): VendorRegistration {
  const base = {
    companyName: "",
    corporateAddress: "",
    stateOfIncorporation: "",
    entityType: undefined,
    organizationType: [],
    specialCertification: undefined,
    nationwide: false,
    usDotNumber: "",
    websiteUrl: "",
    yearFounded: undefined,
    w9Form: undefined,
    certificateOfInsurance: undefined,
    distributorLicense: undefined,
    companyLogo: undefined,
    salesRepFirstName: "",
    salesRepLastName: "",
    salesRepEmail: "",
    salesRepPhone: "",
    dispatchContactName: "",
    dispatchPhone: "",
    dispatchEmail: "",
    emergencyDispatchName: "",
    emergencyDispatchPhone: "",
    emergencyDispatchEmail: "",
    billingAddress: "",
    billingContactName: "",
    billingEmail: "",
    billingPhone: "",
    deliveryContactInfo: "",
    billingSystem: "",
    operatingHours: [],
    terminalsAvailable: "",
    pricingBasis: undefined,
    pricingBasisOther: "",
    areasOwnedTrucks: "",
    areasSubcontracted: "",
    tankwagonsCount: undefined,
    transportsCount: undefined,
    annualGallonsDistributed: undefined,
    standardOrderLeadTime: "",
    productsOffered: [],
    brandsOffered: "",
    emergencyRetainerWilling: undefined,
    emergencyOrderLeadTime: "",
    emergencyResponseTimes: "",
    deliveryCapabilities: [],
    additionalServices: [],
    otherServices: "",
    wetHoseTicketType: "",
    telematicsSystem: "",
    dispatchSoftware: "",
    licensedStates: [],
  } as unknown as VendorRegistration

  return { ...base, ...cleanInitial(initial) }
}

function cleanInitial(initial?: Partial<VendorRegistration>) {
  if (!initial) return {}
  return Object.fromEntries(
    Object.entries(initial).filter(([, v]) => v !== undefined && v !== null)
  )
}

// --------------------------------------------------------------------------
// Reusable bound fields
// --------------------------------------------------------------------------
function TextField({
  control,
  name,
  label,
  placeholder,
  optional,
  type = "text",
  colSpan,
}: {
  control: Ctrl
  name: Name
  label: string
  placeholder?: string
  optional?: boolean
  type?: string
  colSpan?: boolean
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(colSpan && "sm:col-span-2")}>
          <FormLabel>
            {label}
            {optional ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                (optional)
              </span>
            ) : null}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function NumberField({
  control,
  name,
  label,
  placeholder,
}: {
  control: Ctrl
  name: Name
  label: string
  placeholder?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              placeholder={placeholder}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={
                typeof field.value === "number" ? String(field.value) : ""
              }
              onChange={(e) =>
                field.onChange(
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function TextAreaField({
  control,
  name,
  label,
  placeholder,
  optional,
  rows = 3,
}: {
  control: Ctrl
  name: Name
  label: string
  placeholder?: string
  optional?: boolean
  rows?: number
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {optional ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                (optional)
              </span>
            ) : null}
          </FormLabel>
          <FormControl>
            <Textarea
              rows={rows}
              placeholder={placeholder}
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function SelectField({
  control,
  name,
  label,
  placeholder,
  options,
}: {
  control: Ctrl
  name: Name
  label: string
  placeholder: string
  options: readonly string[]
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            value={typeof field.value === "string" ? field.value : null}
            onValueChange={(v) => field.onChange(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
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

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

function ChipsField({
  control,
  name,
  label,
  options,
}: {
  control: Ctrl
  name: Name
  label: string
  options: readonly string[]
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = (field.value as string[]) ?? []
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  active={value.includes(opt)}
                  onClick={() => field.onChange(toggle(value, opt))}
                />
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

function CheckboxGroupField({
  control,
  name,
  label,
  options,
}: {
  control: Ctrl
  name: Name
  label: string
  options: readonly string[]
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = (field.value as string[]) ?? []
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {options.map((opt) => {
                const checked = value.includes(opt)
                return (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-background p-3 text-sm transition-colors hover:border-brand-blue/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => field.onChange(toggle(value, opt))}
                      className="mt-0.5"
                    />
                    <span className="leading-snug text-foreground">{opt}</span>
                  </label>
                )
              })}
            </div>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

function BoolField({
  control,
  name,
  label,
}: {
  control: Ctrl
  name: Name
  label: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex gap-2">
            {[
              { label: "Yes", val: true },
              { label: "No", val: false },
            ].map((opt) => (
              <Chip
                key={opt.label}
                label={opt.label}
                active={field.value === opt.val}
                onClick={() => field.onChange(opt.val)}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function SectionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>
}

// --------------------------------------------------------------------------
// Main form
// --------------------------------------------------------------------------
export function RegistrationForm({
  token,
  applicationId,
  previewMode,
  initialData,
}: {
  token: string
  applicationId: string
  previewMode: boolean
  initialData?: Partial<VendorRegistration>
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [maxVisited, setMaxVisited] = useState(0)
  const [isPending, startTransition] = useTransition()
  const storageKey = `gridlink:vendor-registration:${token}`
  const hydrated = useRef(false)

  const form = useForm<VendorRegistration>({
    resolver: zodResolver(VendorRegistrationSchema),
    mode: "onTouched",
    defaultValues: buildDefaults(initialData),
  })

  // Load any saved draft once on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        form.reset(buildDefaults({ ...initialData, ...parsed }))
      }
    } catch {
      // ignore malformed drafts
    }
    hydrated.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist draft on every change.
  useEffect(() => {
    const sub = form.watch((values) => {
      if (!hydrated.current) return
      try {
        localStorage.setItem(storageKey, JSON.stringify(values))
      } catch {
        // storage may be unavailable (private mode) — non-fatal
      }
    })
    return () => sub.unsubscribe()
  }, [form, storageKey])

  const totalSteps = STEPS.length
  const current = STEPS[step]
  const completedCount = maxVisited

  async function goNext() {
    const valid = await form.trigger(current.fields)
    if (!valid) return
    const next = Math.min(step + 1, totalSteps - 1)
    setStep(next)
    setMaxVisited((m) => Math.max(m, next))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function goToStep(target: number) {
    if (target <= maxVisited) {
      setStep(target)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  function onSubmit(values: VendorRegistration) {
    startTransition(async () => {
      const result = await submitVendorRegistration(token, values)
      if (result.ok) {
        try {
          localStorage.removeItem(storageKey)
        } catch {
          // ignore
        }
        router.push("/vendor-registration/submitted")
      } else {
        toast.error(result.message)
      }
    })
  }

  const control = form.control

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Progress header */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-navy">
              Step {step + 1} of {totalSteps} · {current.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalSteps} complete
            </p>
          </div>
          <Progress
            value={((step + 1) / totalSteps) * 100}
            className="mt-3"
          />
          <div className="mt-4 flex flex-wrap gap-1.5">
            {STEPS.map((s, i) => {
              const done = i < maxVisited
              const isCurrent = i === step
              const reachable = i <= maxVisited
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStep(i)}
                  disabled={!reachable}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    isCurrent
                      ? "bg-navy text-navy-foreground"
                      : done
                        ? "bg-emerald/10 text-emerald hover:bg-emerald/20"
                        : "bg-muted text-muted-foreground",
                    !reachable && "cursor-not-allowed opacity-60"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-[10px]",
                      isCurrent
                        ? "bg-white/20"
                        : done
                          ? "bg-emerald/20"
                          : "bg-background/60"
                    )}
                  >
                    {done && !isCurrent ? (
                      <Check className="size-2.5" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {s.title}
                </button>
              )
            })}
          </div>
        </div>

        {/* Step body */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {current.id === "company" && (
            <StepShell
              title="Company Information"
              description="Tell us about your business entity and corporate details."
            >
              <SectionGrid>
                <TextField
                  control={control}
                  name="companyName"
                  label="Company name"
                  placeholder="Acme Fuel Co."
                />
                <TextField
                  control={control}
                  name="stateOfIncorporation"
                  label="State of incorporation"
                  placeholder="Delaware"
                />
                <TextField
                  control={control}
                  name="corporateAddress"
                  label="Corporate address"
                  placeholder="123 Industrial Pkwy, Springfield, IL"
                  colSpan
                />
                <SelectField
                  control={control}
                  name="entityType"
                  label="Entity type"
                  placeholder="Select entity type"
                  options={ENTITY_TYPES}
                />
                <SelectField
                  control={control}
                  name="specialCertification"
                  label="Special certification"
                  placeholder="Select if applicable"
                  options={SPECIAL_CERTIFICATIONS}
                />
                <TextField
                  control={control}
                  name="usDotNumber"
                  label="US DOT number"
                  placeholder="1234567"
                  optional
                />
                <NumberField
                  control={control}
                  name="yearFounded"
                  label="Year founded"
                  placeholder="2008"
                />
                <TextField
                  control={control}
                  name="websiteUrl"
                  label="Website"
                  placeholder="https://acmefuel.com"
                  optional
                  colSpan
                />
              </SectionGrid>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <ChipsField
                  control={control}
                  name="organizationType"
                  label="Organization type"
                  options={ORGANIZATION_TYPES}
                />
                <BoolField
                  control={control}
                  name="nationwide"
                  label="Do you operate nationwide?"
                />
              </div>
            </StepShell>
          )}

          {current.id === "documents" && (
            <StepShell
              title="Documents"
              description="Upload your compliance documents. W-9 and Certificate of Insurance are required."
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <FileUploadField<VendorRegistration>
                  name="w9Form"
                  label="W-9 form"
                  applicationId={applicationId}
                  documentType="w9"
                  required
                />
                <FileUploadField<VendorRegistration>
                  name="certificateOfInsurance"
                  label="Certificate of insurance"
                  applicationId={applicationId}
                  documentType="coi"
                  required
                />
                <FileUploadField<VendorRegistration>
                  name="distributorLicense"
                  label="Distributor license"
                  applicationId={applicationId}
                  documentType="distributor_license"
                  description="Optional, but speeds up verification."
                />
                <FileUploadField<VendorRegistration>
                  name="companyLogo"
                  label="Company logo"
                  applicationId={applicationId}
                  documentType="logo"
                  accept=".png,.jpg,.jpeg,.svg"
                  description="Shown on your Verified Directory profile."
                />
              </div>
            </StepShell>
          )}

          {current.id === "contacts" && (
            <StepShell
              title="Contacts"
              description="Who should buyers and the GridLink team coordinate with?"
            >
              <ContactBlock title="Sales representative">
                <SectionGrid>
                  <TextField control={control} name="salesRepFirstName" label="First name" />
                  <TextField control={control} name="salesRepLastName" label="Last name" />
                  <TextField control={control} name="salesRepEmail" label="Email" type="email" />
                  <TextField control={control} name="salesRepPhone" label="Phone" type="tel" />
                </SectionGrid>
              </ContactBlock>
              <ContactBlock title="Dispatch">
                <SectionGrid>
                  <TextField control={control} name="dispatchContactName" label="Contact name" />
                  <TextField control={control} name="dispatchPhone" label="Phone" type="tel" />
                  <TextField control={control} name="dispatchEmail" label="Email" type="email" colSpan />
                </SectionGrid>
              </ContactBlock>
              <ContactBlock title="Emergency dispatch">
                <SectionGrid>
                  <TextField control={control} name="emergencyDispatchName" label="Contact name" />
                  <TextField control={control} name="emergencyDispatchPhone" label="Phone" type="tel" />
                  <TextField control={control} name="emergencyDispatchEmail" label="Email" type="email" colSpan />
                </SectionGrid>
              </ContactBlock>
            </StepShell>
          )}

          {current.id === "billing" && (
            <StepShell
              title="Billing"
              description="Billing contact and any system integration notes."
            >
              <SectionGrid>
                <TextField control={control} name="billingAddress" label="Billing address" colSpan />
                <TextField control={control} name="billingContactName" label="Billing contact name" />
                <TextField control={control} name="billingPhone" label="Billing phone" type="tel" />
                <TextField control={control} name="billingEmail" label="Billing email" type="email" colSpan />
                <TextField
                  control={control}
                  name="billingSystem"
                  label="Billing system"
                  placeholder="e.g. NetSuite, QuickBooks (for API notes)"
                  optional
                />
                <TextField
                  control={control}
                  name="deliveryContactInfo"
                  label="Delivery contact info"
                  optional
                />
              </SectionGrid>
            </StepShell>
          )}

          {current.id === "operations" && (
            <StepShell
              title="Operations"
              description="Your fleet, capacity, pricing, and lead times."
            >
              <div className="space-y-6">
                <ChipsField
                  control={control}
                  name="operatingHours"
                  label="Operating hours"
                  options={OPERATING_HOURS}
                />
                <SectionGrid>
                  <NumberField control={control} name="tankwagonsCount" label="Tankwagons" placeholder="0" />
                  <NumberField control={control} name="transportsCount" label="Transports" placeholder="0" />
                  <NumberField
                    control={control}
                    name="annualGallonsDistributed"
                    label="Annual gallons distributed"
                    placeholder="0"
                  />
                  <TextField
                    control={control}
                    name="standardOrderLeadTime"
                    label="Standard order lead time"
                    placeholder="e.g. 24–48 hours"
                  />
                  <SelectField
                    control={control}
                    name="pricingBasis"
                    label="Pricing basis"
                    placeholder="Select pricing basis"
                    options={PRICING_BASIS}
                  />
                  <TextField
                    control={control}
                    name="pricingBasisOther"
                    label="Pricing basis (if other)"
                    optional
                  />
                </SectionGrid>
                <TextAreaField
                  control={control}
                  name="terminalsAvailable"
                  label="Terminals available"
                  placeholder="List terminals you can pull from."
                  optional
                />
                <SectionGrid>
                  <TextAreaField
                    control={control}
                    name="areasOwnedTrucks"
                    label="Areas served (owned trucks)"
                    optional
                  />
                  <TextAreaField
                    control={control}
                    name="areasSubcontracted"
                    label="Areas served (subcontracted)"
                    optional
                  />
                </SectionGrid>

                <div className="rounded-xl border border-border bg-muted/20 p-5">
                  <h4 className="text-sm font-semibold text-navy">
                    Emergency services
                  </h4>
                  <div className="mt-4 space-y-5">
                    <ChipsField
                      control={control}
                      name="emergencyRetainerWilling"
                      label="Willing to hold an emergency retainer?"
                      options={EMERGENCY_RETAINER_OPTIONS}
                    />
                    <TextField
                      control={control}
                      name="emergencyOrderLeadTime"
                      label="Emergency order lead time"
                      placeholder="e.g. 4 hours"
                    />
                    <TextAreaField
                      control={control}
                      name="emergencyResponseTimes"
                      label="Emergency response times & pricing"
                      placeholder="Describe your response times and any emergency pricing."
                    />
                  </div>
                </div>
              </div>
            </StepShell>
          )}

          {current.id === "products" && (
            <StepShell
              title="Products Offered"
              description="Select every product you can supply."
            >
              <div className="space-y-6">
                {Object.entries(PRODUCT_CATEGORIES).map(([category, items]) => (
                  <div key={category}>
                    <p className="mb-3 text-sm font-semibold text-navy">
                      {category}
                    </p>
                    <FormField
                      control={control}
                      name="productsOffered"
                      render={({ field }) => {
                        const value = (field.value as string[]) ?? []
                        return (
                          <div className="flex flex-wrap gap-2">
                            {items.map((opt) => (
                              <Chip
                                key={opt}
                                label={opt}
                                active={value.includes(opt)}
                                onClick={() =>
                                  field.onChange(toggle(value, opt))
                                }
                              />
                            ))}
                          </div>
                        )
                      }}
                    />
                  </div>
                ))}
                <FormField
                  control={control}
                  name="productsOffered"
                  render={() => (
                    <FormItem>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <TextField
                  control={control}
                  name="brandsOffered"
                  label="Brands offered"
                  placeholder="e.g. Rotella, Petro-Canada"
                  optional
                />
              </div>
            </StepShell>
          )}

          {current.id === "capabilities" && (
            <StepShell
              title="Capabilities"
              description="Delivery capabilities and supporting technology."
            >
              <div className="space-y-8">
                <CheckboxGroupField
                  control={control}
                  name="deliveryCapabilities"
                  label="Delivery capabilities"
                  options={DELIVERY_CAPABILITIES}
                />
                <CheckboxGroupField
                  control={control}
                  name="additionalServices"
                  label="Additional services & technology"
                  options={ADDITIONAL_SERVICES}
                />
                <SectionGrid>
                  <TextField
                    control={control}
                    name="wetHoseTicketType"
                    label="Wet-hose ticket type"
                    placeholder="e.g. bar codes, handwritten"
                    optional
                  />
                  <TextField
                    control={control}
                    name="dispatchSoftware"
                    label="Dispatch software"
                    optional
                  />
                  <TextField
                    control={control}
                    name="telematicsSystem"
                    label="Telematics system"
                    optional
                  />
                  <TextField
                    control={control}
                    name="otherServices"
                    label="Other services"
                    optional
                  />
                </SectionGrid>
              </div>
            </StepShell>
          )}

          {current.id === "states" && (
            <StepShell
              title="Licensed States"
              description="Select every state where you are licensed to operate."
            >
              <FormField
                control={control}
                name="licensedStates"
                render={({ field }) => {
                  const value = (field.value as string[]) ?? []
                  const allSelected = value.length === US_STATES.length
                  return (
                    <FormItem>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {value.length} selected
                        </span>
                        <button
                          type="button"
                          className="text-sm font-medium text-brand-blue hover:underline"
                          onClick={() =>
                            field.onChange(allSelected ? [] : [...US_STATES])
                          }
                        >
                          {allSelected ? "Clear all" : "Select all"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {US_STATES.map((state) => (
                          <Chip
                            key={state}
                            label={state}
                            active={value.includes(state)}
                            onClick={() => field.onChange(toggle(value, state))}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
            </StepShell>
          )}

          {current.id === "review" && (
            <ReviewStep form={form} goToStep={goToStep} />
          )}
        </div>

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={goBack}
            disabled={step === 0}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          {step < totalSteps - 1 ? (
            <Button type="button" size="lg" onClick={goNext} className="gap-2">
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={isPending} className="gap-2">
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  Submit application
                  <Check className="size-4" />
                </>
              )}
            </Button>
          )}
        </div>
        {previewMode ? null : null}
      </form>
    </Form>
  )
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-navy">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ContactBlock({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="mb-3 text-sm font-semibold text-navy">{title}</h4>
      {children}
    </div>
  )
}

function ReviewStep({
  form,
  goToStep,
}: {
  form: ReturnType<typeof useForm<VendorRegistration>>
  goToStep: (i: number) => void
}) {
  const v = form.getValues()
  const docCount = [
    v.w9Form,
    v.certificateOfInsurance,
    v.distributorLicense,
    v.companyLogo,
  ].filter(Boolean).length

  const rows: { step: number; label: string; value: string }[] = [
    { step: 0, label: "Company", value: v.companyName || "—" },
    { step: 1, label: "Documents uploaded", value: `${docCount} file(s)` },
    {
      step: 2,
      label: "Sales rep",
      value:
        [v.salesRepFirstName, v.salesRepLastName].filter(Boolean).join(" ") ||
        "—",
    },
    { step: 3, label: "Billing email", value: v.billingEmail || "—" },
    {
      step: 4,
      label: "Annual gallons",
      value: v.annualGallonsDistributed
        ? v.annualGallonsDistributed.toLocaleString()
        : "—",
    },
    {
      step: 5,
      label: "Products",
      value: v.productsOffered?.length
        ? `${v.productsOffered.length} selected`
        : "—",
    },
    {
      step: 6,
      label: "Capabilities",
      value: `${(v.deliveryCapabilities?.length ?? 0) + (v.additionalServices?.length ?? 0)} selected`,
    },
    {
      step: 7,
      label: "Licensed states",
      value: v.licensedStates?.length
        ? `${v.licensedStates.length} state(s)`
        : "—",
    },
  ]

  return (
    <StepShell
      title="Review & Submit"
      description="Double-check your profile before submitting for verification."
    >
      <div className="divide-y divide-border rounded-xl border border-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {row.label}
              </p>
              <p className="truncate text-sm font-medium text-navy">
                {row.value}
              </p>
            </div>
            <button
              type="button"
              onClick={() => goToStep(row.step)}
              className="shrink-0 text-sm font-medium text-brand-blue hover:underline"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        By submitting, you confirm the information provided is accurate. The
        GridLink team will review your profile for verification.
      </p>
    </StepShell>
  )
}
