"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { FileText, Loader2, Send, Upload } from "lucide-react"

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

export function VendorBidForm({
  rfpId,
  quantityGallons,
  pricingMode,
  indexName,
  preview = false,
  disabled,
}: {
  rfpId: string
  quantityGallons: number
  pricingMode: PricingMode
  indexName: string | null
  preview?: boolean
  disabled?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const form = useForm<RfpBidInput>({
    resolver: zodResolver(RfpBidSchema),
    defaultValues: {
      pricingMode,
      pricePerGallon: undefined,
      indexName: indexName ?? "",
      differential: undefined,
      referenceIndexPrice: undefined,
      totalPrice: 0,
      deliveryTerms: "",
      validityDays: 30,
      notes: "",
      attachmentName: "",
      attachmentPath: "",
    },
  })

  const ppg = form.watch("pricePerGallon")
  const diff = form.watch("differential")
  const ref = form.watch("referenceIndexPrice")
  const attachmentName = form.watch("attachmentName")

  useEffect(() => {
    const effective = pricingMode === "index" ? (ref ?? 0) + (diff ?? 0) : ppg ?? 0
    if (effective > 0 && quantityGallons > 0) {
      form.setValue("totalPrice", Math.round(effective * quantityGallons * 100) / 100)
    }
  }, [ppg, diff, ref, quantityGallons, pricingMode, form])

  const effectivePpg = pricingMode === "index" ? (ref ?? 0) + (diff ?? 0) : ppg ?? 0

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const res = await submitBid(rfpId, values)
            if (res.ok) toast.success("Bid submitted")
            else toast.error(res.message)
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
          <FormField
            control={form.control}
            name="totalPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{pricingMode === "index" ? "Estimated total ($)" : "Total price ($)"}</FormLabel>
                <FormControl>{numberInput({ ...field, onChange: (v) => field.onChange(v ?? 0) }, "0.01", { disabled, min: 0 })}</FormControl>
                {pricingMode === "index" && effectivePpg > 0 ? (
                  <p className="text-xs text-muted-foreground">≈ ${effectivePpg.toFixed(4)}/gal at today&apos;s index × {quantityGallons.toLocaleString()} gal</p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
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
                <Textarea rows={2} disabled={disabled} {...field} />
              </FormControl>
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

        <Button type="submit" size="lg" disabled={disabled || isPending || uploading} className="gap-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Submit bid
        </Button>
      </form>
    </Form>
  )
}
