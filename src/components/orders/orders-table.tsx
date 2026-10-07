"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Ban, CalendarCheck, Loader2, Truck } from "lucide-react"

import type { OrderView } from "@/lib/data/orders"
import type { PartyRole } from "@/lib/invoicing/types"
import { cancelBuyerOrder } from "@/app/buyer/(portal)/orders/actions"
import { cancelVendorOrder, confirmVendorOrder } from "@/app/vendor/(portal)/orders/actions"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { LogDeliveryDialog } from "@/components/orders/log-delivery-dialog"
import { Button } from "@/components/ui/button"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

function fmt(d: string | null) {
  if (!d) return "—"
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC", month: "short", day: "numeric" })
}

/** The user's own calendar day, as YYYY-MM-DD. */
const todayLocal = () => new Date().toLocaleDateString("en-CA")

export function OrdersTable({
  orders,
  role,
  showContract = true,
  preview = false,
}: {
  orders: OrderView[]
  role: PartyRole
  showContract?: boolean
  preview?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState<OrderView | null>(null)
  const [logging, setLogging] = useState<OrderView | null>(null)
  const [cancelling, setCancelling] = useState<OrderView | null>(null)
  const [scheduledFor, setScheduledFor] = useState("")
  // Each dialog keeps its own text so a schedule note can't end up as a cancel reason.
  const [scheduleNote, setScheduleNote] = useState("")
  const [cancelReason, setCancelReason] = useState("")

  const today = todayLocal()
  const scheduleInPast = !!scheduledFor && scheduledFor < today

  function openSchedule(o: OrderView) {
    setScheduleNote("")
    // A window that already started can't be scheduled on its first day any more.
    setScheduledFor(o.scheduledFor && o.scheduledFor >= today ? o.scheduledFor : o.windowStart < today ? today : o.windowStart)
    setConfirming(o)
  }
  function closeSchedule() {
    setConfirming(null)
    setScheduleNote("")
  }
  function openCancel(o: OrderView) {
    setCancelReason("")
    setCancelling(o)
  }
  function closeCancel() {
    setCancelling(null)
    setCancelReason("")
  }

  function run(fn: () => Promise<{ ok: true } | { ok: false; message: string }>, success: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(success)
        closeSchedule(); closeCancel()
        router.refresh()
      } else toast.error(res.message)
    })
  }

  const isOpen = (o: OrderView) => !["delivered", "cancelled"].includes(o.status)
  const counterparty = (o: OrderView) => (role === "vendor" ? o.buyerName : o.vendorName)

  function status(o: OrderView) {
    return (
      <>
        <OrderStatusBadge status={o.status} late={o.isLate} urgency={o.urgency} />
        {o.status === "cancelled" && o.cancelledReason ? (
          <p className="mt-1 max-w-[16rem] whitespace-normal text-xs text-muted-foreground">Reason: {o.cancelledReason}</p>
        ) : null}
      </>
    )
  }

  function actions(o: OrderView, stacked = false) {
    const open = isOpen(o)
    if (!open) return null
    return (
      <div className={cn("flex gap-1", stacked ? "flex-wrap" : "justify-end")}>
        {role === "vendor" && (o.status === "requested" || o.status === "confirmed") ? (
          <Button size="sm" onClick={() => openSchedule(o)} className="gap-1">
            <CalendarCheck className="size-3.5" />
            Schedule
          </Button>
        ) : null}
        {role === "vendor" ? (
          <Button size="sm" variant="outline" onClick={() => setLogging(o)} className="gap-1">
            <Truck className="size-3.5" />
            Log delivery
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" aria-label={`Cancel order for ${o.gallons.toLocaleString()} gal to ${o.siteAddress}`} title="Cancel order" onClick={() => openCancel(o)}>
          <Ban className="size-3.5" />
          {stacked ? "Cancel order" : null}
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Phones: one card per order so status and actions aren't scrolled off-screen. */}
      <div className="space-y-3 sm:hidden">
        {orders.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          orders.map((o) => (
            <div key={o.id} data-order-card className={cn("rounded-xl border border-border bg-card p-4", o.urgency === "emergency" && isOpen(o) && "border-red-200 bg-red-50/40")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {showContract ? <p className="font-medium leading-snug text-navy">{o.contractTitle}</p> : null}
                  <p className={cn("text-sm", showContract ? "text-muted-foreground" : "font-medium text-navy")}>{counterparty(o)}</p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-navy">{o.gallons.toLocaleString()} gal</p>
              </div>
              <div className="mt-2">{status(o)}</div>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted-foreground">Site</dt><dd className="min-w-0 break-words">{o.siteAddress}</dd></div>
                <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted-foreground">Window</dt><dd>{fmt(o.windowStart)} – {fmt(o.windowEnd)}</dd></div>
                <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted-foreground">Scheduled</dt><dd>{fmt(o.scheduledFor)}</dd></div>
              </dl>
              {isOpen(o) ? <div className="mt-3 border-t border-border pt-3">{actions(o, true)}</div> : null}
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {showContract ? <TableHead className="text-xs uppercase tracking-wide">Contract</TableHead> : null}
              <TableHead className={cn("text-xs uppercase tracking-wide", showContract && "hidden 2xl:table-cell")}>{role === "vendor" ? "Buyer" : "Supplier"}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Site</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Gallons</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Window</TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wide 2xl:table-cell">Scheduled</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
              <TableHead className="sticky right-0 bg-muted"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showContract ? 8 : 7} className="h-24 text-center text-muted-foreground">No orders yet.</TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id} className={cn(o.urgency === "emergency" && isOpen(o) && "bg-red-50/40")}>
                  {showContract ? (
                    <TableCell className="max-w-[220px] font-medium text-navy">
                      <span className="block truncate" title={o.contractTitle}>{o.contractTitle}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground 2xl:hidden">{counterparty(o)}</span>
                    </TableCell>
                  ) : null}
                  <TableCell className={cn(showContract && "hidden 2xl:table-cell")}>{counterparty(o)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground" title={o.siteAddress}>{o.siteAddress}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.gallons.toLocaleString()}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {fmt(o.windowStart)} – {fmt(o.windowEnd)}
                    {o.scheduledFor ? <span className="block text-xs text-foreground 2xl:hidden">Scheduled {fmt(o.scheduledFor)}</span> : null}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap 2xl:table-cell">{fmt(o.scheduledFor)}</TableCell>
                  <TableCell>{status(o)}</TableCell>
                  <TableCell className="sticky right-0 bg-card text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.08)]">{actions(o)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!confirming} onOpenChange={(o) => !o && closeSchedule()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule delivery</DialogTitle>
            <DialogDescription>
              {confirming ? `${confirming.gallons.toLocaleString()} gal to ${confirming.siteAddress}. Requested ${fmt(confirming.windowStart)} – ${fmt(confirming.windowEnd)}.` : null}
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-medium">
            Delivery date
            <Input type="date" min={today} value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="mt-1" aria-invalid={scheduleInPast} />
          </label>
          {scheduleInPast ? (
            <p className="text-sm text-destructive">Pick today or a later date — a delivery can&apos;t be scheduled in the past.</p>
          ) : confirming && scheduledFor && (scheduledFor < confirming.windowStart || scheduledFor > confirming.windowEnd) ? (
            <p className="text-sm text-amber-700">This is outside the window the buyer asked for ({fmt(confirming.windowStart)} – {fmt(confirming.windowEnd)}).</p>
          ) : null}
          <label className="block text-sm font-medium">
            Note to buyer (optional)
            <Textarea rows={2} value={scheduleNote} onChange={(e) => setScheduleNote(e.target.value)} className="mt-1" placeholder="e.g. Tankwagon arriving 7–9am" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={closeSchedule}>Cancel</Button>
            <Button disabled={isPending || !scheduledFor || scheduleInPast} onClick={() => confirming && run(() => confirmVendorOrder(confirming.id, confirming.contractId, { scheduledFor, note: scheduleNote }), "Delivery scheduled")} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck className="size-4" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelling} onOpenChange={(o) => !o && closeCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>The other party will see it as cancelled with your reason.</DialogDescription>
          </DialogHeader>
          <Textarea rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason (optional)" aria-label="Reason for cancelling" />
          <DialogFooter>
            <Button variant="outline" onClick={closeCancel}>Keep order</Button>
            <Button variant="destructive" disabled={isPending} onClick={() => cancelling && run(() => (role === "buyer" ? cancelBuyerOrder(cancelling.id, cancelling.contractId, cancelReason) : cancelVendorOrder(cancelling.id, cancelling.contractId, cancelReason)), "Order cancelled")}>
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {logging ? (
        <LogDeliveryDialog
          open
          onOpenChange={(o) => !o && setLogging(null)}
          contractId={logging.contractId}
          order={logging}
          preview={preview}
        />
      ) : null}
    </>
  )
}
