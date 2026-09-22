"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Ban, CalendarPlus, Copy, Loader2, Lock, Pencil, RotateCcw } from "lucide-react"

import type { BuyerRfpDetail } from "@/lib/rfp/types"
import {
  cancelRfpAction,
  closeBidding,
  duplicateRfpAction,
  extendDeadline,
} from "@/app/buyer/(portal)/rfps/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { cn } from "@/lib/utils"

function plusDays(days: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function RfpLifecycleActions({ rfp }: { rfp: BuyerRfpDetail }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [extendOpen, setExtendOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [newDue, setNewDue] = useState(() => plusDays(14))
  const [renderedAt] = useState(() => Date.now())

  const s = rfp.status
  const pastDue = !!rfp.bidDueDate && new Date(rfp.bidDueDate).getTime() < renderedAt

  function run(fn: () => Promise<{ ok: true; rfpId?: string } | { ok: false; message: string }>, success: string, go?: (id?: string) => string) {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(success)
        setExtendOpen(false); setCancelOpen(false); setCloseOpen(false)
        if (go) router.push(go(res.rfpId))
        router.refresh()
      } else toast.error(res.message)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {s === "draft" ? (
        <Link href={`/buyer/rfps/${rfp.id}/edit`} className={cn(buttonVariants(), "gap-2")}>
          <Pencil className="size-4" />
          Edit draft
        </Link>
      ) : null}

      {s === "published" ? (
        <>
          <Button variant="outline" onClick={() => setExtendOpen(true)} className="gap-2">
            <CalendarPlus className="size-4" />
            Extend deadline
          </Button>
          <Button variant="outline" onClick={() => setCloseOpen(true)} className="gap-2">
            <Lock className="size-4" />
            Close bidding
          </Button>
        </>
      ) : null}

      {s === "closed" ? (
        <Button variant="outline" onClick={() => setExtendOpen(true)} className="gap-2">
          <RotateCcw className="size-4" />
          Re-open bidding
        </Button>
      ) : null}

      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => run(() => duplicateRfpAction(rfp.id), "Draft copy created", (id) => `/buyer/rfps/${id}/edit`)}
        className="gap-2"
      >
        <Copy className="size-4" />
        Duplicate
      </Button>

      {s !== "awarded" && s !== "cancelled" ? (
        <Button variant="ghost" onClick={() => setCancelOpen(true)} className="gap-2 text-muted-foreground">
          <Ban className="size-4" />
          {s === "draft" ? "Discard draft" : "Cancel RFP"}
        </Button>
      ) : null}

      {s === "closed" ? (
        <span className="text-xs text-muted-foreground">
          {pastDue ? "Bidding closed at the deadline." : "Bidding closed."} You can still award from the Responses tab.
        </span>
      ) : null}

      {/* Extend / re-open */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{s === "closed" ? "Re-open bidding" : "Extend the bid deadline"}</DialogTitle>
            <DialogDescription>
              Invited suppliers can submit or update bids until the new date. Bidding closes automatically when it passes.
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-medium">
            New bid due date
            <Input type="date" value={newDue} min={plusDays(1)} onChange={(e) => setNewDue(e.target.value)} className="mt-1" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>Cancel</Button>
            <Button disabled={isPending} onClick={() => run(() => extendDeadline(rfp.id, newDue), s === "closed" ? "Bidding re-opened" : "Deadline extended")} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
              {s === "closed" ? "Re-open" : "Extend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close bidding */}
      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close bidding now?</AlertDialogTitle>
            <AlertDialogDescription>
              Suppliers will no longer be able to submit or change bids. You can re-open later or award from the bids received.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Keep open</Button>
            <Button disabled={isPending} onClick={() => run(() => closeBidding(rfp.id), "Bidding closed")}>Close bidding</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{s === "draft" ? "Discard this draft?" : "Cancel this RFP?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {s === "draft"
                ? "The draft will be marked cancelled and hidden from suppliers. This can't be undone."
                : "Invited suppliers will see it as cancelled and any bids will not be considered. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Go back</Button>
            <Button variant="destructive" disabled={isPending} onClick={() => run(() => cancelRfpAction(rfp.id), s === "draft" ? "Draft discarded" : "RFP cancelled")}>
              {s === "draft" ? "Discard draft" : "Cancel RFP"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
