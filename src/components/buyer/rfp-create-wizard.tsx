"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react"

import type { DirectoryVendor } from "@/lib/directory/shared"
import {
  RfpWizardSchema,
  type RfpWizardInput,
  RFP_FUEL_TYPES,
  RFP_RECURRENCE,
  RFP_URGENCY,
} from "@/lib/schemas/rfp-wizard"
import {
  DELIVERY_CAPABILITIES,
  SPECIAL_CERTIFICATIONS,
  US_STATES,
} from "@/lib/schemas/vendor-application"
import { matchVerifiedSuppliers } from "@/lib/rfp/match-suppliers"
import { publishRfp, saveRfpDraft } from "@/app/buyer/(portal)/rfps/actions"
import { SupplierPickerModal } from "@/components/buyer/supplier-picker-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
import { cn } from "@/lib/utils"

const STEPS = [
  "Basics",
  "Delivery",
  "Requirements",
  "Suppliers",
  "Timeline",
  "Review",
] as const

const STEP_FIELDS: (keyof RfpWizardInput)[][] = [
  ["title", "description", "fuelType", "quantityGallons", "recurrence", "urgency"],
  ["deliveryStates", "deliveryAddresses", "deliveryDates"],
  ["requiredCapabilities", "requiredCertifications", "insuranceRequirements"],
  ["supplierInviteMode", "selectedVendorIds"],
  ["bidDueDate", "decisionDate", "expectedAwardDate"],
  [],
]

export function RfpCreateWizard({ vendors }: { vendors: DirectoryVendor[] }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<RfpWizardInput>({
    resolver: zodResolver(RfpWizardSchema),
    defaultValues: {
      title: "",
      description: "",
      fuelType: "Diesel",
      quantityGallons: 100000,
      recurrence: "one_time",
      urgency: "standard",
      deliveryStates: [],
      deliveryAddresses: [{ address: "" }],
      deliveryDates: [""],
      requiredCapabilities: [],
      requiredCertifications: [],
      insuranceRequirements: "",
      supplierInviteMode: "auto",
      selectedVendorIds: [],
      bidDueDate: "",
      decisionDate: "",
      expectedAwardDate: "",
    },
  })

  const addrFields = useFieldArray({ control: form.control, name: "deliveryAddresses" })
  const watchAll = form.watch()

  const matched = useMemo(
    () =>
      matchVerifiedSuppliers(vendors, {
        states: watchAll.deliveryStates ?? [],
        capabilities: watchAll.requiredCapabilities ?? [],
        certifications: (watchAll.requiredCertifications ?? []).filter((c) => c !== "None"),
      }),
    [
      vendors,
      watchAll.deliveryStates,
      watchAll.requiredCapabilities,
      watchAll.requiredCertifications,
    ]
  )

  useEffect(() => {
    if (watchAll.supplierInviteMode === "auto" && matched.length) {
      form.setValue(
        "selectedVendorIds",
        matched.map((v) => v.id),
        { shouldValidate: true }
      )
    }
  }, [watchAll.supplierInviteMode, matched, form])

  async function goNext() {
    const fields = STEP_FIELDS[step]
    const valid = fields.length ? await form.trigger(fields) : true
    if (!valid) return
    if (step === 3 && !form.getValues("selectedVendorIds").length) {
      toast.error("Select at least one supplier to invite.")
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function ChipToggle({
    label,
    active,
    onToggle,
  }: {
    label: string
    active: boolean
    onToggle: () => void
  }) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          active
            ? "border-brand-blue bg-brand-blue text-white"
            : "border-border text-muted-foreground hover:border-brand-blue/40"
        )}
      >
        {label}
      </button>
    )
  }

  return (
    <Form {...form}>
      <form className="space-y-8">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                i === step
                  ? "bg-navy text-navy-foreground"
                  : i < step
                    ? "bg-brand-blue/15 text-brand-blue"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Bulk Diesel — Fleet FY27" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RFP_FUEL_TYPES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantityGallons"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity (gallons)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RFP_RECURRENCE.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r === "one_time" ? "One-time" : "Recurring"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RFP_URGENCY.map((u) => (
                          <SelectItem key={u} value={u} className="capitalize">
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="deliveryStates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery states</FormLabel>
                  <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border p-3">
                    {US_STATES.map((state) => {
                      const on = field.value?.includes(state)
                      return (
                        <ChipToggle
                          key={state}
                          label={state}
                          active={!!on}
                          onToggle={() => {
                            const next = on
                              ? field.value.filter((s) => s !== state)
                              : [...(field.value ?? []), state]
                            field.onChange(next)
                          }}
                        />
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel>Delivery addresses</FormLabel>
              {addrFields.fields.map((f, i) => (
                <div key={f.id} className="mt-2 flex gap-2">
                  <FormField
                    control={form.control}
                    name={`deliveryAddresses.${i}.address`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Street, city, state ZIP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {addrFields.fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => addrFields.remove(i)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => addrFields.append({ address: "" })}
              >
                <Plus className="size-4" />
                Add address
              </Button>
            </div>
            <FormField
              control={form.control}
              name="deliveryDates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required delivery dates</FormLabel>
                  {field.value.map((_, i) => (
                    <Input
                      key={i}
                      type="date"
                      className="mt-2"
                      value={field.value[i] ?? ""}
                      onChange={(e) => {
                        const next = [...field.value]
                        next[i] = e.target.value
                        field.onChange(next)
                      }}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => field.onChange([...field.value, ""])}
                  >
                    <Plus className="size-4" />
                    Add date
                  </Button>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="requiredCapabilities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required capabilities</FormLabel>
                  <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border p-3">
                    {DELIVERY_CAPABILITIES.map((cap) => {
                      const on = field.value?.includes(cap)
                      return (
                        <ChipToggle
                          key={cap}
                          label={cap}
                          active={!!on}
                          onToggle={() => {
                            field.onChange(
                              on
                                ? field.value.filter((c) => c !== cap)
                                : [...(field.value ?? []), cap]
                            )
                          }}
                        />
                      )
                    })}
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requiredCertifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required certifications</FormLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {SPECIAL_CERTIFICATIONS.filter((c) => c !== "None").map((cert) => {
                      const on = field.value?.includes(cert)
                      return (
                        <ChipToggle
                          key={cert}
                          label={cert}
                          active={!!on}
                          onToggle={() => {
                            field.onChange(
                              on
                                ? field.value.filter((c) => c !== cert)
                                : [...(field.value ?? []), cert]
                            )
                          }}
                        />
                      )
                    })}
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="insuranceRequirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance requirements</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="$2M GL, $1M auto…" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="supplierInviteMode"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
                    <input
                      type="radio"
                      checked={field.value === "auto"}
                      onChange={() => field.onChange("auto")}
                    />
                    <span>
                      <span className="font-medium text-navy">
                        Auto-invite matching verified suppliers
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        GridLink suggests suppliers based on states, capabilities, and
                        certifications. Confirm the list below.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
                    <input
                      type="radio"
                      checked={field.value === "manual"}
                      onChange={() => field.onChange("manual")}
                    />
                    <span>
                      <span className="font-medium text-navy">Choose specific suppliers</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        Pick from the Verified Directory.
                      </span>
                    </span>
                  </label>
                </FormItem>
              )}
            />
            {watchAll.supplierInviteMode === "manual" ? (
              <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                Select suppliers ({form.getValues("selectedVendorIds").length})
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {matched.length} matching suppliers suggested
              </p>
            )}
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {(watchAll.supplierInviteMode === "auto" ? matched : vendors.filter((v) =>
                form.getValues("selectedVendorIds").includes(v.id)
              )).map((v) => (
                <li key={v.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.getValues("selectedVendorIds").includes(v.id)}
                    onCheckedChange={(checked) => {
                      const ids = form.getValues("selectedVendorIds")
                      form.setValue(
                        "selectedVendorIds",
                        checked ? [...ids, v.id] : ids.filter((id) => id !== v.id)
                      )
                    }}
                  />
                  <span className="font-medium text-navy">{v.companyName}</span>
                </li>
              ))}
            </ul>
            <SupplierPickerModal
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              vendors={vendors}
              selectedIds={form.getValues("selectedVendorIds")}
              onConfirm={(ids) => form.setValue("selectedVendorIds", ids)}
            />
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["bidDueDate", "Bid due date"],
                ["decisionDate", "Decision date"],
                ["expectedAwardDate", "Expected award date"],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm space-y-3">
            <p>
              <strong>Title:</strong> {watchAll.title}
            </p>
            <p>
              <strong>Fuel:</strong> {watchAll.fuelType} · {watchAll.quantityGallons?.toLocaleString()}{" "}
              gal · {watchAll.urgency}
            </p>
            <p>
              <strong>States:</strong> {watchAll.deliveryStates?.join(", ")}
            </p>
            <p>
              <strong>Suppliers:</strong> {watchAll.selectedVendorIds?.length} selected
            </p>
            <p>
              <strong>Bid due:</strong> {watchAll.bidDueDate}
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-6">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || isPending}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div className="flex gap-2">
            {step === STEPS.length - 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await saveRfpDraft(form.getValues())
                      if (res.ok) {
                        toast.success("Draft saved")
                        router.push(`/buyer/rfps/${res.rfpId}`)
                      } else toast.error(res.message)
                    })
                  }}
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await publishRfp(form.getValues())
                      if (res.ok) {
                        toast.success("RFP published — invitations sent")
                        router.push(`/buyer/rfps/${res.rfpId}`)
                      } else toast.error(res.message)
                    })
                  }}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Publish & Send Invitations
                </Button>
              </>
            ) : (
              <Button type="button" onClick={goNext}>
                Next
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}
