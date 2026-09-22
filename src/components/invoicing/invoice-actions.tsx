"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AlertTriangle, Ban, CheckCircle2, Download, Loader2, Pencil, Send, Wallet } from "lucide-react"

import type { InvoiceDetail, PartyRole } from "@/lib/invoicing/types"
import { isOpenStatus, money } from "@/lib/invoicing/types"
import { DisputeSchema, PAYMENT_METHODS, PaymentSchema, type PaymentFormValues } from "@/lib/schemas/invoice"
import {
  recordVendorPayment,
  resolveDisputeAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "@/app/vendor/(portal)/invoices/actions"
import { disputeInvoiceAction, recordBuyerPayment } from "@/app/buyer/(portal)/invoices/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { cn } from "@/lib/utils"

const METHOD_LABEL: Record<(typeof PAYMENT_METHODS)[number], string> = {
  ach: "ACH",
  check: "Check",
  wire: "Wire",
  card: "Card",
  other: "Other",
}
const METHOD_ITEMS = PAYMENT_METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))

export function InvoiceActions({ invoice, role }: { invoice: InvoiceDetail; role: PartyRole }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [payOpen, setPayOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [text, setText] = useState("")

  const open = isOpenStatus(invoice.status)
  const pdfHref = `/api/invoices/${invoice.id}/pdf`

  function run(fn: () => Promise<{ ok: true } | { ok: false; message: string }>, success: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(success)
        setPayOpen(false); setDisputeOpen(false); setVoidOpen(false); setResolveOpen(false)
        setText("")
        router.refresh()
      } else toast.error(res.message)
    })
  }

  const payForm = useForm<PaymentFormValues>({
    resolver: zodResolver(PaymentSchema),
    defaultValues: {
      amount: invoice.balance,
      method: "ach",
      reference: "",
      paidAt: new Date().toISOString().slice(0, 10),
      note: "",
    },
  })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={pdfHref} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
        <Download className="size-4" />
        PDF
      </a>

      {role === "vendor" && invoice.status === "draft" ? (
        <>
          <Link href={`/vendor/invoices/${invoice.id}/edit`} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <Pencil className="size-4" />
            Edit
          </Link>
          <Button
            disabled={isPending || invoice.total <= 0}
            onClick={() => run(() => sendInvoiceAction(invoice.id), "Invoice sent to buyer")}
            className="gap-2"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send to buyer
          </Button>
        </>
      ) : null}

      {role === "vendor" && invoice.status === "disputed" ? (
        <Button variant="outline" onClick={() => setResolveOpen(true)} className="gap-2">
          <CheckCircle2 className="size-4" />
          Resolve dispute
        </Button>
      ) : null}

      {open ? (
        <Button onClick={() => setPayOpen(true)} className="gap-2" variant={role === "buyer" ? "default" : "outline"}>
          <Wallet className="size-4" />
          Record payment
        </Button>
      ) : null}

      {role === "buyer" && open && invoice.status !== "disputed" ? (
        <Button variant="outline" onClick={() => setDisputeOpen(true)} className="gap-2 text-red-700 hover:text-red-800">
          <AlertTriangle className="size-4" />
          Dispute
        </Button>
      ) : null}

      {role === "vendor" && invoice.status !== "paid" && invoice.status !== "void" ? (
        <Button variant="ghost" onClick={() => setVoidOpen(true)} className="gap-2 text-muted-foreground">
          <Ban className="size-4" />
          Void
        </Button>
      ) : null}

      {/* Record payment */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              Balance due on {invoice.number}: <strong>{money(invoice.balance)}</strong>. Partial payments are fine.
            </DialogDescription>
          </DialogHeader>
          <Form {...payForm}>
            <form
              className="space-y-4"
              onSubmit={payForm.handleSubmit((values) =>
                run(
                  () => (role === "buyer" ? recordBuyerPayment(invoice.id, values) : recordVendorPayment(invoice.id, values)),
                  "Payment recorded"
                )
              )}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={payForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min={0} {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={payForm.control}
                  name="paidAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={payForm.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Method</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} items={METHOD_ITEMS}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={payForm.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference #</FormLabel>
                      <FormControl>
                        <Input placeholder="ACH trace, check number…" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={payForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
                  Record payment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dispute */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute invoice {invoice.number}</DialogTitle>
            <DialogDescription>
              Tell {invoice.vendorName} what needs to change. Payment is paused until they resolve it.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Ticket T-89110 shows 11,400 gal, invoice shows 12,000." />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => {
                const parsed = DisputeSchema.safeParse({ reason: text })
                if (!parsed.success) return toast.error(parsed.error.issues[0]?.message)
                run(() => disputeInvoiceAction(invoice.id, parsed.data), "Dispute sent to supplier")
              }}
              className="gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
              Submit dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve dispute */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve dispute</DialogTitle>
            <DialogDescription>
              {invoice.disputeReason ? <>Buyer&apos;s note: “{invoice.disputeReason}”</> : null}
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="What you changed or confirmed (shown in the activity log)" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button type="button" disabled={isPending} onClick={() => run(() => resolveDisputeAction(invoice.id, text), "Dispute resolved")} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Mark resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void */}
      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void invoice {invoice.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice stays in your history but can no longer be paid. Issue a new invoice if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reason (optional)" />
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setVoidOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => run(() => voidInvoiceAction(invoice.id, text), "Invoice voided")}>
              Void invoice
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
