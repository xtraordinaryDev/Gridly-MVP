"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ShieldX, ThumbsUp } from "lucide-react"

import type { BuyerApplicationDetail } from "@/lib/data/buyer-applications"
import type { ApplicationStatus } from "@/lib/data/applications"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/admin/status-badge"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { approveBuyer, rejectBuyer } from "../actions"

export function BuyerReviewActions({
  application,
  preview,
}: {
  application: BuyerApplicationDetail
  preview: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ApplicationStatus>(application.status)
  const [notes, setNotes] = useState("")
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isPending, startTransition] = useTransition()

  const decided = status === "approved" || status === "rejected"

  function handleApprove() {
    startTransition(async () => {
      const res = await approveBuyer(application.id, notes)
      if (res.ok) {
        setStatus("approved")
        toast.success(
          preview
            ? "Approved (preview) — buyer would receive a create-account email."
            : "Buyer approved. Create-account email sent."
        )
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      const res = await rejectBuyer(application.id, rejectReason)
      if (res.ok) {
        setStatus("rejected")
        setRejectOpen(false)
        setRejectReason("")
        toast.success(preview ? "Rejected (preview)." : "Request rejected.")
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="sticky top-20 space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Status</span>
          <StatusBadge status={status} size="lg" />
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-navy">
            Internal notes
          </label>
          <Textarea
            rows={3}
            placeholder="Notes for the GridLink team (not shown to the buyer)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <Button
          type="button"
          size="lg"
          onClick={handleApprove}
          disabled={isPending || decided}
          className="w-full gap-2 bg-emerald text-emerald-foreground hover:bg-emerald/90"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ThumbsUp className="size-4" />
          )}
          Approve
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setRejectOpen(true)}
          disabled={isPending || decided}
          className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <ShieldX className="size-4" />
          Reject
        </Button>

        {decided ? (
          <p className="pt-1 text-center text-xs text-muted-foreground">
            This request has been {status}.
          </p>
        ) : null}
      </div>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the request as rejected and notify the buyer. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            rows={3}
            placeholder="Reason (optional, internal)…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Reject request
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
