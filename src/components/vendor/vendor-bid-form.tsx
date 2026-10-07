"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, type FieldErrors, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { FileText, Loader2, Save, Send, Upload } from "lucide-react"

import type { RfpResponseView } from "@/lib/rfp/types"
import { money } from "@/lib/invoicing/types"

import { RfpBidSchema, type RfpBidInput, type PricingMode } from "@/lib/schemas/rfp-wizard"
import { submitBid } from "@/app/vendor/(portal)/opportunities/actions"
import { uploadAttachment } from "@/components/attachments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

function numberInput(field: { value: number | undefined | null; onChange: (v: number | undefined) => void; name: string; onBlur: () => void; ref: (el: HTMLInputElement | null) => void }, step: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      type="number"
      step={step}
      name={field.name}
      ref={field.ref}
      onBlur={field.onBlur}
      value={field.value == null || Number.isNaN(field.value) ? "" : String(field.value)}
      onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
      {...extra}
    />
  )
}

// The shared schema's built-in checks surface Zod's own wording ("Too small:
// expected number to be >=0"). Swap those for something a person would say.
const FRIENDLY: Partial<Record<keyof RfpBidInput, string>> = {
  pricePerGallon: "Enter a price per gallon greater than zero",
  differential: "Enter your differential as a number (it can be negative)",
  referenceIndexPrice: "Enter today's index price, greater than zero",
  totalPrice: "Enter a price so the total can be calculated",
  validityDays: "Enter a whole number of days, 1 or more",
  deliveryTerms: "Delivery terms are required",
}
const RAW_ZOD = /^(Too small|Too big|Invalid input|Invalid)/

const bidResolver: Resolver<RfpBidInput> = async (values, context, options) => {
  const result = await zodResolver(RfpBidSchema)(values, context, options)
  const errors = result.errors as FieldErrors<RfpBidInput>
  for (const key of Object.keys(errors) as (keyof RfpBidInput)[]) {
    const err = errors[key]
    if (err && FRIENDLY[key] && (!err.message || RAW_ZOD.test(String(err.message)))) err.message = FRIENDLY[key]
  }
  return result
}

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places

export function VendorBidForm({
  rfpId,
  quantityGallons,
  pricingMode,
  indexName,
  preview = false,
  disabled,
  initial,
  onDone,
  onCancel,
}: {
  rfpId: string
  quantityGallons: number
  pricingMode: PricingMode
  indexName: string | null
  preview?: boolean
  disabled?: boolean
  /** Existing bid to edit; submitting replaces it */
  initial?: RfpResponseView | null
  onDone?: () => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Index bids store the effective $/gal, so the reference price they were
  // quoted against is that minus the differential.
  const initialRef = initial && pricingMode === "index" ? round(initial.pricePerGallon - (initial.differential ?? 0), 4) : undefined

  const form = useForm<RfpBidInput>({
    resolver: bidResolver,
    defaultValues: {
      pricingMode,
      pricePerGallon: initial && pricingMode === "fixed" ? initial.pricePerGallon : undefined,
      indexName: (pricingMode === "index" && initial?.indexName) || indexName || "",
      differential: initial && pricingMode === "index" ? initial.differential ?? undefined : undefined,
      referenceIndexPrice: initialRef && initialRef > 0 ? initialRef : undefined,
      totalPrice: 0,
      deliveryTerms: initial?.deliveryTerms ?? "",
      validityDays: initial?.validityDays || 30,
      notes: initial?.notes ?? "",
      attachmentName: initial?.attachmentName ?? "",
      attachmentPath: initial?.attachmentPath ?? "",
    },
  })

  const ppg = form.watch("pricePerGallon")
  const diff = form.watch("differential")
  const ref = form.watch("referenceIndexPrice")
  const attachmentName = form.watch("attachmentName")

  const effectivePpg = pricingMode === "index" ? (ref ?? 0) + (diff ?? 0) : ppg ?? 0
  // The total is always $/gal × the RFP quantity; the server recomputes it too.
  const computedTotal = effectivePpg > 0 && quantityGallons > 0 ? round(effectivePpg * quantityGallons, 2) : 0
  const totalEditable = quantityGallons <= 0

  useEffect(() => {
    if (totalEditable) return
    form.setValue("totalPrice", computedTotal)
    if (computedTotal > 0) form.clearErrors("totalPrice")
  }, [computedTotal, totalEditable, form])

  return (
    <Form {...form}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const res = await submitBid(rfpId, totalEditable ? values : { ...values, totalPrice: computedTotal })
            if (res.ok) {
              toast.success(initial ? "Bid updated" : "Bid submitted")
              // Same transition, so the summary only reappears with the saved values.
              startTransition(() => {
                router.refresh()
                onDone?.()
              })
            } else toast.error(res.message)
          })
        })}
      >
        {pricingMode === "index" ? (
          <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4 text-sm">
            <p className="font-medium text-navy">Index-priced RFP</p>
            <p className="mt-1 text-muted-foreground">
              The buyer wants pricing as <strong>{indexName ?? "a published index"}</strong> plus or minus your differential. Enter today&apos;s index so we can estimate the contract total.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {pricingMode === "fixed" ? (
            <FormField
              control={form.control}
              name="pricePerGallon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per gallon ($)</FormLabel>
                  <FormControl>{numberInput(field, "0.0001", { disabled, min: 0 })}</FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <>
              <FormField
                control={form.control}
                name="indexName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Index</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="differential"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your differential ($/gal, +/-)</FormLabel>
                    <FormControl>{numberInput(field, "0.0001", { disabled, placeholder: "e.g. 0.0850 or -0.0200" })}</FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referenceIndexPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Today&apos;s index price ($/gal)</FormLabel>
                    <FormControl>{numberInput(field, "0.0001", { disabled, min: 0 })}</FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          {totalEditable ? (
            <FormField
              control={form.control}
              name="totalPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{pricingMode === "index" ? "Estimated total ($)" : "Total price ($)"}</FormLabel>
                  <FormControl>{numberInput({ ...field, onChange: (v) => field.onChange(v ?? 0) }, "0.01", { disabled, min: 0 })}</FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="grid content-start gap-2">
              <p className="flex items-center text-sm leading-none font-medium">{pricingMode === "index" ? "Estimated total" : "Total price"}</p>
              <output aria-label={pricingMode === "index" ? "Estimated total" : "Total price"} className="flex h-9 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-semibold tabular-nums text-navy">
                {computedTotal > 0 ? money(computedTotal) : "—"}
              </output>
              <p className="text-xs text-muted-foreground">
                {computedTotal > 0
                  ? `${pricingMode === "index" ? "≈ " : ""}$${effectivePpg.toFixed(4)}/gal × ${quantityGallons.toLocaleString()} gal`
                  : `Calculated from your price × ${quantityGallons.toLocaleString()} gal`}
              </p>
            </div>
          )}
        </div>
        <FormField
          control={form.control}
          name="deliveryTerms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery terms</FormLabel>
              <FormControl>
                <Textarea rows={3} disabled={disabled} placeholder="e.g. Delivered, net 30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="validityDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Validity (days)</FormLabel>
              <FormControl>{numberInput({ ...field, onChange: (v) => field.onChange(v ?? 0) }, "1", { disabled, min: 1 })}</FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={2} maxLength={4000} disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Attachment (optional)</FormLabel>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.docx"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.currentTarget.value = ""
              if (!f) return
              setUploading(true)
              try {
                const a = await uploadAttachment(f, `bids/${rfpId}`, preview)
                form.setValue("attachmentName", a.name)
                form.setValue("attachmentPath", a.path)
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Upload failed")
              } finally {
                setUploading(false)
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={disabled || uploading} onClick={() => fileRef.current?.click()} className="gap-1.5">
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {attachmentName ? "Replace file" : "Attach file"}
            </Button>
            {attachmentName ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileText className="size-4" />
                {attachmentName}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">Price sheet, COI, or supporting documents. Up to 15 MB.</p>
        </FormItem>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" disabled={disabled || isPending || uploading} className="gap-2">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : initial ? <Save className="size-4" /> : <Send className="size-4" />}
            {initial ? "Save changes" : "Submit bid"}
          </Button>
          {onCancel ? (
            <Button type="button" size="lg" variant="outline" disabled={isPending} onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  )
}
