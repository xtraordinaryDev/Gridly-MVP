"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { ArrowRight, Check, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  SupplierInterestSchema,
  type SupplierInterest,
  INTEREST_PRODUCTS,
  ANNUAL_GALLONS_RANGES,
} from "@/lib/schemas/supplier-interest"
import { US_STATES } from "@/lib/schemas/vendor-application"
import { submitSupplierInterest } from "./actions"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

export function SupplierInterestForm() {
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

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

  function toggleArrayValue<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value]
  }

  function onSubmit(values: SupplierInterest) {
    startTransition(async () => {
      const result = await submitSupplierInterest(values)
      if (result.ok) {
        setSubmitted(true)
      } else {
        toast.error(result.message)
      }
    })
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald/15 text-emerald">
          <Check className="size-7" />
        </span>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-navy">
          Thank you for your interest.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          The GridLink team will review your submission and reach out within 3–5
          business days with onboarding next steps.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Fuel Co." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact name</FormLabel>
                <FormControl>
                  <Input placeholder="Jordan Rivera" {...field} />
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
                  <Input
                    type="email"
                    placeholder="jordan@acmefuel.com"
                    {...field}
                  />
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
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>
                  Company website{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://acmefuel.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="statesServed"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>States served</FormLabel>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{field.value.length} selected</span>
                  <button
                    type="button"
                    className="font-medium text-brand-blue hover:underline"
                    onClick={() =>
                      field.onChange(
                        field.value.length === US_STATES.length
                          ? []
                          : [...US_STATES]
                      )
                    }
                  >
                    {field.value.length === US_STATES.length
                      ? "Clear all"
                      : "Select all"}
                  </button>
                </div>
              </div>
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3">
                {US_STATES.map((state) => (
                  <Chip
                    key={state}
                    label={state}
                    active={field.value.includes(state)}
                    onClick={() =>
                      field.onChange(toggleArrayValue(field.value, state))
                    }
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="productsOffered"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Products offered</FormLabel>
              <div className="flex flex-wrap gap-2">
                {INTEREST_PRODUCTS.map((product) => (
                  <Chip
                    key={product}
                    label={product}
                    active={field.value.includes(product)}
                    onClick={() =>
                      field.onChange(toggleArrayValue(field.value, product))
                    }
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="annualGallons"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>Annual gallons distributed</FormLabel>
              <Select
                value={field.value ?? null}
                onValueChange={(value) => field.onChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a range" />
                </SelectTrigger>
                <SelectContent>
                  {ANNUAL_GALLONS_RANGES.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range} gallons
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
            <FormItem>
              <FormLabel>Brief description of company</FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  placeholder="Tell us about your operations, coverage area, fleet, and what makes your company a strong fuel supplier."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            We&apos;ll review your submission and reach out within 3–5 business
            days.
          </p>
          <Button type="submit" size="lg" disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit application
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
