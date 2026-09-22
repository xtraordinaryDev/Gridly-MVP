"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Plus, Save, Send, Trash2 } from "lucide-react"

import type { ContractSummary, InvoiceDetail } from "@/lib/invoicing/types"
import type { DeliveryView } from "@/lib/data/orders"
import { money } from "@/lib/invoicing/types"
import {
  InvoiceSchema,
  computeTotals,
  type InvoiceFormValues,
} from "@/lib/schemas/invoice"
import {
  createAndSendInvoice,
  saveInvoiceDraft,
  saveInvoiceEdits,
  sendInvoiceAction,
} from "@/app/vendor/(portal)/invoices/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
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

const KIND_LABEL = { fuel: "Fuel delivery", fee: "Fee", tax: "Tax", credit: "Credit" } as const
const KIND_ITEMS = (Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function numberField(v: number | null | undefined) {
  return v == null || Number.isNaN(v) ? "" : String(v)
}

export function InvoiceForm({
  contracts,
  initial,
  defaultContractId,
  unbilled = [],
}: {
  contracts: ContractSummary[]
  initial?: InvoiceDetail
  defaultContractId?: string
  /** Logged deliveries not yet on an invoice, across the vendor's contracts */
  unbilled?: DeliveryView[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<"draft" | "send" | null>(null)

  const firstContract = contracts.find((c) => c.id === defaultContractId) ?? contracts[0]

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(InvoiceSchema),
    defaultValues: initial
      ? {
          contractId: initial.contractId,
          issueDate: initial.issueDate,
          dueDate: initial.dueDate,
          notes: initial.notes ?? "",
          lineItems: initial.lineItems.map((l) => ({
            kind: l.kind,
            description: l.description,
            deliveryDate: l.deliveryDate ?? "",
            ticketNumber: l.ticketNumber ?? "",
            gallons: l.gallons,
            pricePerGallon: l.pricePerGallon,
            indexPrice: l.indexPrice ?? null,
            deliveryId: l.deliveryId ?? "",
            amount: l.amount,
          })),
        }
      : {
          contractId: firstContract?.id ?? "",
          issueDate: todayISO(),
          dueDate: addDays(todayISO(), firstContract?.netDays ?? 30),
          notes: "",
          lineItems: [
            {
              kind: "fuel",
              description: firstContract ? `${firstContract.fuelType} delivery` : "Fuel delivery",
              deliveryDate: todayISO(),
              ticketNumber: "",
              gallons: null,
              pricePerGallon: firstContract?.pricePerGallon ?? null,
              indexPrice: null,
              deliveryId: "",
              amount: 0,
            },
          ],
        },
  })

  const lines = useFieldArray({ control: form.control, name: "lineItems" })
  const watched = form.watch()
  const contract = contracts.find((c) => c.id === watched.contractId)

  // When the contract changes on a new invoice, refresh due date + default $/gal.
  useEffect(() => {
    if (initial || !contract) return
    form.setValue("dueDate", addDays(form.getValues("issueDate") || todayISO(), contract.netDays))
    const items = form.getValues("lineItems")
    items.forEach((l, i) => {
      if (l.kind === "fuel" && !l.pricePerGallon) form.setValue(`lineItems.${i}.pricePerGallon`, contract.pricePerGallon)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched.contractId])

  // Keep fuel line amounts in sync with gallons × price.
  useEffect(() => {
    const diff = contract?.pricingMode === "index" ? contract.differential ?? 0 : 0
    watched.lineItems?.forEach((l, i) => {
      if (l.kind === "fuel") {
        if (contract?.pricingMode === "index") {
          const ppg = l.indexPrice ? Math.round((l.indexPrice + diff) * 10000) / 10000 : null
          if (ppg !== (l.pricePerGallon ?? null)) form.setValue(`lineItems.${i}.pricePerGallon`, ppg)
          const amt = l.gallons && ppg ? Math.round(l.gallons * ppg * 100) / 100 : 0
          if (amt !== l.amount) form.setValue(`lineItems.${i}.amount`, amt)
        } else {
          const amt = l.gallons && l.pricePerGallon ? Math.round(l.gallons * l.pricePerGallon * 100) / 100 : 0
          if (amt !== l.amount) form.setValue(`lineItems.${i}.amount`, amt)
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watched.lineItems?.map((l) => [l.kind, l.gallons, l.pricePerGallon, l.indexPrice])), contract?.pricingMode, contract?.differential])

  const totals = useMemo(() => computeTotals(watched.lineItems ?? []), [watched.lineItems])

  function addLine(kind: "fuel" | "fee" | "tax" | "credit") {
    lines.append({
      kind,
      description:
        kind === "fuel" ? `${contract?.fuelType ?? "Fuel"} delivery` : kind === "fee" ? "Delivery fee" : kind === "tax" ? "State fuel tax" : "Credit",
      deliveryDate: kind === "fuel" ? todayISO() : "",
      ticketNumber: "",
      gallons: null,
      pricePerGallon: kind === "fuel" ? contract?.pricePerGallon ?? null : null,
      indexPrice: null,
      deliveryId: "",
      amount: 0,
    })
  }

  const isIndex = contract?.pricingMode === "index"
  const contractUnbilled = unbilled.filter((d) => d.contractId === contract?.id && !(watched.lineItems ?? []).some((l) => l.deliveryId === d.id))

  function addDelivery(d: DeliveryView) {
    const empty = (watched.lineItems ?? []).findIndex((l) => l.kind === "fuel" && !l.gallons && !l.deliveryId)
    const line = {
      kind: "fuel" as const,
      description: `${contract?.fuelType ?? "Fuel"} — ${d.siteAddress}`,
      deliveryDate: d.deliveredAt,
      ticketNumber: d.ticketNumber ?? "",
      gallons: d.gallons,
      pricePerGallon: isIndex ? null : contract?.pricePerGallon ?? null,
      indexPrice: null,
      deliveryId: d.id,
      amount: 0,
    }
    if (empty >= 0) lines.update(empty, line)
    else lines.append(line)
  }

  function submit(kind: "draft" | "send") {
    form.handleSubmit((values) => {
      setMode(kind)
      startTransition(async () => {
        let res
        if (initial) {
          res = await saveInvoiceEdits(initial.id, values)
          if (res.ok && kind === "send") res = await sendInvoiceAction(initial.id)
        } else {
          res = kind === "send" ? await createAndSendInvoice(values) : await saveInvoiceDraft(values)
        }
        setMode(null)
        if (res.ok) {
          toast.success(kind === "send" ? "Invoice sent to buyer" : "Draft saved")
          router.push(`/vendor/invoices/${res.invoiceId ?? initial?.id}`)
          router.refresh()
        } else {
          toast.error(res.message)
        }
      })
    })()
  }

  if (!contracts.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          You don&apos;t have any awarded contracts yet. Invoices are created against a contract once a buyer
          awards you an RFP.
        </CardContent>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem className="sm:col-span-3">
                  <FormLabel>Contract</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!!initial}
                    items={contracts.map((c) => ({ value: c.id, label: `${c.title} — ${c.buyerName}` }))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contract" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contracts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title} — {c.buyerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {contract ? (
                    <p className="text-xs text-muted-foreground">
                      Bill to <span className="font-medium text-foreground">{contract.buyerName}</span> · awarded at{" "}
                      ${contract.pricePerGallon.toFixed(4)}/gal · Net {contract.netDays}
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="issueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {initial ? (
              <div>
                <p className="text-sm font-medium">Invoice number</p>
                <p className="mt-2 text-sm text-muted-foreground">{initial.number}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">Invoice number</p>
                <p className="mt-2 text-sm text-muted-foreground">Assigned when saved</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-navy">Line items</h2>
              <div className="flex flex-wrap gap-2">
                {(["fuel", "fee", "tax", "credit"] as const).map((k) => (
                  <Button key={k} type="button" variant="outline" size="sm" onClick={() => addLine(k)} className="gap-1">
                    <Plus className="size-3.5" />
                    {KIND_LABEL[k]}
                  </Button>
                ))}
              </div>
            </div>

            {contractUnbilled.length ? (
              <div className="mb-4 rounded-xl border border-emerald/30 bg-emerald/5 p-3">
                <p className="text-sm font-medium text-navy">{contractUnbilled.length} unbilled deliver{contractUnbilled.length === 1 ? "y" : "ies"} on this contract</p>
                <ul className="mt-2 space-y-1.5">
                  {contractUnbilled.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-muted-foreground">
                        {new Date(d.deliveredAt + "T12:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC", month: "short", day: "numeric" })} · {d.gallons.toLocaleString()} gal · {d.ticketNumber ?? "no ticket"} · {d.siteAddress}
                      </span>
                      <Button type="button" size="sm" variant="outline" onClick={() => addDelivery(d)} className="gap-1"><Plus className="size-3.5" />Add</Button>
                    </li>
                  ))}
                </ul>
                {contractUnbilled.length > 1 ? (
                  <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => contractUnbilled.forEach(addDelivery)}>Add all</Button>
                ) : null}
              </div>
            ) : null}
            {isIndex ? (
              <p className="mb-3 text-xs text-muted-foreground">
                Index contract: enter the <strong>{contract?.indexName ?? "index"}</strong> price on each delivery date; $/gal = index {contract && contract.differential != null ? (contract.differential >= 0 ? "+ $" : "− $") + Math.abs(contract.differential).toFixed(4) : "+ differential"}.
              </p>
            ) : null}
            <div className="space-y-3">
              {lines.fields.map((f, i) => {
                const kind = watched.lineItems?.[i]?.kind ?? "fuel"
                return (
                  <div key={f.id} className={cn("rounded-xl border border-border p-4", kind === "credit" && "bg-amber-50/40")}>
                    <div className="grid gap-3 md:grid-cols-12">
                      <FormField
                        control={form.control}
                        name={`lineItems.${i}.kind`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-xs">Type</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange} items={KIND_ITEMS}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(["fuel", "fee", "tax", "credit"] as const).map((k) => (
                                  <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lineItems.${i}.description`}
                        render={({ field }) => (
                          <FormItem className={kind === "fuel" ? "md:col-span-4" : "md:col-span-7"}>
                            <FormLabel className="text-xs">Description</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {kind === "fuel" ? (
                        <>
                          <FormField
                            control={form.control}
                            name={`lineItems.${i}.deliveryDate`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-xs">Delivered</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} value={field.value ?? ""} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lineItems.${i}.ticketNumber`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-xs">Ticket #</FormLabel>
                                <FormControl>
                                  <Input placeholder="T-00000" {...field} value={field.value ?? ""} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lineItems.${i}.gallons`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-xs">Gallons</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    name={field.name}
                                    ref={field.ref}
                                    onBlur={field.onBlur}
                                    value={numberField(field.value)}
                                    onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {isIndex ? (
                            <FormField
                              control={form.control}
                              name={`lineItems.${i}.indexPrice`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel className="text-xs">Index $/gal</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.0001"
                                      min={0}
                                      name={field.name}
                                      ref={field.ref}
                                      onBlur={field.onBlur}
                                      value={numberField(field.value)}
                                      onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
                                    />
                                  </FormControl>
                                  <p className="text-[11px] text-muted-foreground">= ${(watched.lineItems?.[i]?.pricePerGallon ?? 0).toFixed(4)}/gal</p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : null}
                          <FormField
                            control={form.control}
                            name={`lineItems.${i}.pricePerGallon`}
                            render={({ field }) => (
                              <FormItem className={isIndex ? "hidden" : "md:col-span-2"}>
                                <FormLabel className="text-xs">$ / gallon</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.0001"
                                    min={0}
                                    name={field.name}
                                    ref={field.ref}
                                    onBlur={field.onBlur}
                                    value={numberField(field.value)}
                                    onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="md:col-span-10 md:col-start-3 flex items-center justify-end gap-3 text-sm">
                            <span className="text-muted-foreground">Line total</span>
                            <span className="font-semibold tabular-nums text-navy">{money(watched.lineItems?.[i]?.amount ?? 0)}</span>
                          </div>
                        </>
                      ) : (
                        <FormField
                          control={form.control}
                          name={`lineItems.${i}.amount`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-3">
                              <FormLabel className="text-xs">Amount {kind === "credit" ? "(negative)" : ""}</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  name={field.name}
                                  ref={field.ref}
                                  onBlur={field.onBlur}
                                  value={numberField(field.value)}
                                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-muted-foreground"
                        disabled={lines.fields.length === 1}
                        onClick={() => lines.remove(i)}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            {form.formState.errors.lineItems?.root || form.formState.errors.lineItems?.message ? (
              <p className="mt-2 text-sm text-destructive">
                {form.formState.errors.lineItems.root?.message ?? form.formState.errors.lineItems.message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes to buyer (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Remit-to details, PO number, delivery notes…" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 p-6 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{money(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fees</span><span className="tabular-nums">{money(totals.fees)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxes</span><span className="tabular-nums">{money(totals.tax)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-navy">
                <span>Total</span><span className="tabular-nums">{money(totals.total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => submit("draft")} className="gap-2">
            {isPending && mode === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {initial ? "Save changes" : "Save as draft"}
          </Button>
          <Button type="button" disabled={isPending || totals.total <= 0} onClick={() => submit("send")} className="gap-2">
            {isPending && mode === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send to buyer
          </Button>
        </div>
      </form>
    </Form>
  )
}
