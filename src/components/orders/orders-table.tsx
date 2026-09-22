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
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

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
  const [note, setNote] = useState("")

  function run(fn: () => Promise<{ ok: true } | { ok: false; message: string }>, success: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(success)
        setConfirming(null); setCancelling(null); setNote("")
        router.refresh()
      } else toast.error(res.message)
    })
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {showContract ? <TableHead className="text-xs uppercase tracking-wide">Contract</TableHead> : null}
              <TableHead className="text-xs uppercase tracking-wide">{role === "vendor" ? "Buyer" : "Supplier"}</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Site</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Gallons</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Window</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Scheduled</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showContract ? 8 : 7} className="h-24 text-center text-muted-foreground">No orders yet.</TableCell>
              </TableRow>
            ) : (
              orders.map((o) => {
                const open = !["delivered", "cancelled"].includes(o.status)
                return (
                  <TableRow key={o.id} className={cn(o.urgency === "emergency" && open && "bg-red-50/40")}>
                    {showContract ? <TableCell className="max-w-[220px] truncate font-medium text-navy">{o.contractTitle}</TableCell> : null}
                    <TableCell>{role === "vendor" ? o.buyerName : o.vendorName}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground" title={o.siteAddress}>{o.siteAddress}</TableCell>
                    <TableCell className="text-right tabular-nums">{o.gallons.toLocaleString()}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmt(o.windowStart)} – {fmt(o.windowEnd)}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmt(o.scheduledFor)}</TableCell>
                    <TableCell><OrderStatusBadge status={o.status} late={o.isLate} urgency={o.urgency} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {role === "vendor" && (o.status === "requested" || o.status === "confirmed") ? (
                          <Button size="sm" onClick={() => { setConfirming(o); setScheduledFor(o.windowStart) }} className="gap-1">
                            <CalendarCheck className="size-3.5" />
                            Schedule
                          </Button>
                        ) : null}
                        {role === "vendor" && open ? (
                          <Button size="sm" variant="outline" onClick={() => setLogging(o)} className="gap-1">
                            <Truck className="size-3.5" />
                            Log delivery
                          </Button>
                        ) : null}
                        {open ? (
                          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setCancelling(o)}>
                            <Ban className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule delivery</DialogTitle>
            <DialogDescription>
              {confirming ? `${confirming.gallons.toLocaleString()} gal to ${confirming.siteAddress}. Requested ${fmt(confirming.windowStart)} – ${fmt(confirming.windowEnd)}.` : null}
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-medium">
            Delivery date
            <Input type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-sm font-medium">
            Note to buyer (optional)
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" placeholder="e.g. Tankwagon arriving 7–9am" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>Cancel</Button>
            <Button disabled={isPending || !scheduledFor} onClick={() => confirming && run(() => confirmVendorOrder(confirming.id, confirming.contractId, { scheduledFor, note }), "Delivery scheduled")} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck className="size-4" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>The other party will see it as cancelled with your reason.</DialogDescription>
          </DialogHeader>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>Keep order</Button>
            <Button variant="destructive" disabled={isPending} onClick={() => cancelling && run(() => (role === "buyer" ? cancelBuyerOrder(cancelling.id, cancelling.contractId, note) : cancelVendorOrder(cancelling.id, cancelling.contractId, note)), "Order cancelled")}>
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
