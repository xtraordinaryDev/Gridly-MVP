"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileText, Loader2, Truck, Upload } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import type { OrderView } from "@/lib/data/orders"
import { logVendorDelivery } from "@/app/vendor/(portal)/orders/actions"
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

const today = () => new Date().toISOString().slice(0, 10)

export function LogDeliveryDialog({
  open,
  onOpenChange,
  contractId,
  order,
  defaultSite,
  preview,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  order?: OrderView | null
  defaultSite?: string
  preview: boolean
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [deliveredAt, setDeliveredAt] = useState(today())
  const [siteAddress, setSiteAddress] = useState(order?.siteAddress ?? defaultSite ?? "")
  const [gallons, setGallons] = useState(order ? String(order.gallons) : "")
  const [ticketNumber, setTicketNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [bol, setBol] = useState<{ name: string; path: string } | null>(null)

  async function uploadBol(file: File) {
    setUploading(true)
    try {
      const path = `deliveries/${contractId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
      if (!preview) {
        const { error } = await createClient().storage.from("delivery-docs").upload(path, file, { contentType: file.type || undefined })
        if (error) throw new Error(error.message)
      }
      setBol({ name: file.name, path })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a delivery</DialogTitle>
          <DialogDescription>
            {order ? `Closes order for ${order.gallons.toLocaleString()} gal at ${order.siteAddress}.` : "Record a drop against this contract. It becomes an unbilled line for your next invoice."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Delivered on
            <Input type="date" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-sm font-medium">
            Gallons delivered
            <Input type="number" min={0} step="0.01" value={gallons} onChange={(e) => setGallons(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Site
            <Input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} className="mt-1" placeholder="Street, city, state ZIP" />
          </label>
          <label className="block text-sm font-medium">
            Ticket #
            <Input value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} className="mt-1" placeholder="T-00000" />
          </label>
          <div className="text-sm font-medium">
            Bill of lading
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) void uploadBol(f) }} />
            <div className="mt-1 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()} className="gap-1.5">
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                {bol ? "Replace" : "Attach"}
              </Button>
              {bol ? <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><FileText className="size-3.5" /><span className="truncate">{bol.name}</span></span> : null}
            </div>
          </div>
          <label className="block text-sm font-medium sm:col-span-2">
            Notes
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={isPending || uploading}
            className="gap-2"
            onClick={() =>
              startTransition(async () => {
                const res = await logVendorDelivery({ contractId, orderId: order?.id ?? "", deliveredAt, siteAddress, gallons: Number(gallons), ticketNumber, bolPath: bol?.path ?? "", bolName: bol?.name ?? "", notes })
                if (res.ok) {
                  toast.success("Delivery logged")
                  onOpenChange(false)
                  router.refresh()
                } else toast.error(res.message)
              })
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
            Log delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Standalone trigger for logging a delivery without an order. */
export function LogDeliveryButton({ contractId, preview, defaultSite }: { contractId: string; preview: boolean; defaultSite?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Truck className="size-4" />
        Log delivery
      </Button>
      {open ? <LogDeliveryDialog open onOpenChange={setOpen} contractId={contractId} preview={preview} defaultSite={defaultSite} /> : null}
    </>
  )
}
