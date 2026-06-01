"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"

import { RfpBidSchema, type RfpBidInput } from "@/lib/schemas/rfp-wizard"
import { submitBid } from "@/app/vendor/(portal)/opportunities/actions"
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

export function VendorBidForm({
  rfpId,
  quantityGallons,
  disabled,
}: {
  rfpId: string
  quantityGallons: number
  disabled?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<RfpBidInput>({
    resolver: zodResolver(RfpBidSchema),
    defaultValues: {
      pricePerGallon: 0,
      totalPrice: 0,
      deliveryTerms: "",
      validityDays: 30,
      notes: "",
      attachmentName: "",
    },
  })

  const ppg = form.watch("pricePerGallon")

  useEffect(() => {
    if (ppg > 0 && quantityGallons > 0) {
      form.setValue("totalPrice", Math.round(ppg * quantityGallons * 100) / 100)
    }
  }, [ppg, quantityGallons, form])

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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="pricePerGallon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price per gallon ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.0001" disabled={disabled} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="totalPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total price ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" disabled={disabled} {...field} />
                </FormControl>
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
                <Textarea rows={3} disabled={disabled} {...field} />
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
              <FormControl>
                <Input type="number" disabled={disabled} {...field} />
              </FormControl>
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
          <Input
            type="file"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0]
              form.setValue("attachmentName", file?.name ?? "")
            }}
          />
          <p className="text-xs text-muted-foreground">
            File name recorded with bid; full upload wiring in production.
          </p>
        </FormItem>
        <Button type="submit" disabled={disabled || isPending} className="gap-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Submit bid
        </Button>
      </form>
    </Form>
  )
}
