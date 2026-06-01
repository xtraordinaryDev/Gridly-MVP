"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  BadgeCheck,
  Eye,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { VendorProfile } from "@/lib/data/vendor"
import {
  PRODUCTS_OFFERED,
  DELIVERY_CAPABILITIES,
  ADDITIONAL_SERVICES,
  SPECIAL_CERTIFICATIONS,
  US_STATES,
} from "@/lib/schemas/vendor-application"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { updateVendorProfile, requestFieldChange } from "./actions"
import { ProfileSchema, type ProfileValues } from "./schema"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-navy">{title}</h2>
      {children}
    </div>
  )
}

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

function LockedField({
  label,
  value,
  onRequest,
}: {
  label: string
  value: string | null
  onRequest: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <div>
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Lock className="size-3" />
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">
          {value || "—"}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRequest}>
        Request change
      </Button>
    </div>
  )
}

function PublicProfilePreview({ vendor }: { vendor: VendorProfile }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy">{vendor.companyName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {vendor.stateOfIncorporation
              ? `${vendor.entityType ?? "Company"} · ${vendor.stateOfIncorporation}`
              : vendor.entityType}
          </p>
        </div>
        {vendor.isVerified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-3 py-1 text-sm font-medium text-emerald">
            <ShieldCheck className="size-4" />
            GridLink Verified
          </span>
        ) : null}
      </div>

      {vendor.description ? (
        <p className="mt-4 text-sm leading-relaxed text-foreground">
          {vendor.description}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Products
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vendor.productsOffered.length ? (
              vendor.productsOffered.map((p) => (
                <Badge key={p} variant="secondary" className="bg-muted font-normal">
                  {p}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Licensed states
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vendor.licensedStates.length ? (
              vendor.licensedStates.map((s) => (
                <Badge key={s} variant="secondary" className="bg-muted font-normal">
                  {s}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Capabilities
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vendor.deliveryCapabilities.length ? (
              vendor.deliveryCapabilities.map((c) => (
                <Badge key={c} variant="secondary" className="bg-muted font-normal">
                  {c}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            Annual volume
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground">
            {vendor.annualGallonsDistributed
              ? `${vendor.annualGallonsDistributed.toLocaleString()} gal`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            Fleet
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground">
            {(vendor.tankwagonsCount ?? 0) + (vendor.transportsCount ?? 0)} trucks
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            Website
          </dt>
          <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
            {vendor.website ? (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-blue hover:underline"
              >
                {vendor.website}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function ProfileForm({
  vendor,
  preview,
  defaultPreview,
}: {
  vendor: VendorProfile
  preview: boolean
  defaultPreview: boolean
}) {
  const [view, setView] = useState<"edit" | "public">(
    defaultPreview ? "public" : "edit"
  )
  const [isPending, startTransition] = useTransition()
  const [changeField, setChangeField] = useState<string | null>(null)
  const [changeMessage, setChangeMessage] = useState("")

  const form = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      website: vendor.website ?? "",
      corporateAddress: vendor.corporateAddress ?? "",
      usDotNumber: vendor.usDotNumber ?? "",
      yearFounded: vendor.yearFounded ? String(vendor.yearFounded) : "",
      description: vendor.description ?? "",
      specialCertification: vendor.specialCertification ?? "",
      productsOffered: vendor.productsOffered,
      brandsOffered: vendor.brandsOffered ?? "",
      deliveryCapabilities: vendor.deliveryCapabilities,
      additionalServices: vendor.additionalServices,
      licensedStates: vendor.licensedStates,
      tankwagonsCount: vendor.tankwagonsCount ? String(vendor.tankwagonsCount) : "",
      transportsCount: vendor.transportsCount ? String(vendor.transportsCount) : "",
      annualGallonsDistributed: vendor.annualGallonsDistributed
        ? String(vendor.annualGallonsDistributed)
        : "",
      standardOrderLeadTime: vendor.standardOrderLeadTime ?? "",
    },
  })

  function onSubmit(values: ProfileValues) {
    startTransition(async () => {
      const res = await updateVendorProfile(vendor.id, values)
      if (res.ok) {
        toast.success(
          preview ? "Saved (preview) — changes aren't persisted." : "Profile updated."
        )
      } else {
        toast.error(res.message)
      }
    })
  }

  function submitChangeRequest() {
    if (!changeField) return
    startTransition(async () => {
      const res = await requestFieldChange(changeField, changeMessage)
      if (res.ok) {
        toast.success("Change request sent to the GridLink team.")
        setChangeField(null)
        setChangeMessage("")
      } else {
        toast.error(res.message)
      }
    })
  }

  const products = form.watch("productsOffered")
  const delivery = form.watch("deliveryCapabilities")
  const additional = form.watch("additionalServices")
  const states = form.watch("licensedStates")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setView("edit")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "edit"
                ? "bg-navy text-navy-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Pencil className="size-3.5" />
            Edit profile
          </button>
          <button
            type="button"
            onClick={() => setView("public")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "public"
                ? "bg-navy text-navy-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="size-3.5" />
            Public preview
          </button>
        </div>
      </div>

      {view === "public" ? (
        <PublicProfilePreview vendor={vendor} />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Section title="Company Information">
              <div className="mb-5 space-y-2">
                <LockedField
                  label="Legal entity name"
                  value={vendor.companyName}
                  onRequest={() => setChangeField("Legal entity name")}
                />
                <LockedField
                  label="Entity type"
                  value={vendor.entityType}
                  onRequest={() => setChangeField("Entity type")}
                />
                <LockedField
                  label="State of incorporation"
                  value={vendor.stateOfIncorporation}
                  onRequest={() => setChangeField("State of incorporation")}
                />
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BadgeCheck className="size-3.5 text-emerald" />
                  Locked fields are tied to verification. Request a change and
                  our team will review it.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="usDotNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>US DOT number</FormLabel>
                      <FormControl>
                        <Input placeholder="0000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="corporateAddress"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Corporate address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street, City, State ZIP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearFounded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year founded</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" placeholder="2009" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialCertification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special certification</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SPECIAL_CERTIFICATIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Company description</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Tell buyers about your operations…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Section>

            <Section title="Products & Brands">
              <FormField
                control={form.control}
                name="brandsOffered"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Brands offered</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Shell Rotella, Chevron" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormLabel className="mb-2 block">Products offered</FormLabel>
              <Chips
                options={PRODUCTS_OFFERED}
                value={products}
                onChange={(next) => form.setValue("productsOffered", next, { shouldDirty: true })}
              />
            </Section>

            <Section title="Capabilities & Services">
              <FormLabel className="mb-2 block">Delivery capabilities</FormLabel>
              <Chips
                options={DELIVERY_CAPABILITIES}
                value={delivery}
                onChange={(next) => form.setValue("deliveryCapabilities", next, { shouldDirty: true })}
              />
              <FormLabel className="mb-2 mt-5 block">Additional services</FormLabel>
              <Chips
                options={ADDITIONAL_SERVICES}
                value={additional}
                onChange={(next) => form.setValue("additionalServices", next, { shouldDirty: true })}
              />
            </Section>

            <Section title="Operations">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tankwagonsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tankwagons</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transportsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transports</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="annualGallonsDistributed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual gallons distributed</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="standardOrderLeadTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standard order lead time</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 24–48 hours" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Section>

            <Section title="Licensed States">
              <Chips
                options={US_STATES}
                value={states}
                onChange={(next) => form.setValue("licensedStates", next, { shouldDirty: true })}
              />
            </Section>

            <div className="sticky bottom-4 flex justify-end">
              <Button type="submit" size="lg" disabled={isPending} className="gap-2 shadow-lg">
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </form>
        </Form>
      )}

      <Dialog open={!!changeField} onOpenChange={(open) => !open && setChangeField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a change</DialogTitle>
            <DialogDescription>
              {changeField} is locked after verification. Describe the change and
              our team will review it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder={`What should "${changeField}" be updated to, and why?`}
            value={changeMessage}
            onChange={(e) => setChangeMessage(e.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setChangeField(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitChangeRequest}
              disabled={isPending || !changeMessage.trim()}
              className="gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
