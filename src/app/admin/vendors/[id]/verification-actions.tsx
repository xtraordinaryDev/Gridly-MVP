"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { setVendorVerification } from "../actions"

export function VerificationActions({
  vendorId,
  companyName,
  isVerified,
  hasAuditTrail,
  preview,
}: {
  vendorId: string
  companyName: string
  isVerified: boolean
  /** The reason is stored on the originating application's activity log; seeded vendors have none. */
  hasAuditTrail: boolean
  preview: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const res = await setVendorVerification(vendorId, !isVerified, reason)
      if (res.ok) {
        setOpen(false)
        setReason("")
        toast.success(
          preview
            ? "Updated (preview)."
            : isVerified
              ? "Verification suspended. The supplier is hidden from buyers."
              : "Verification restored. The supplier is visible to buyers again."
        )
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={
          isVerified
            ? "w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
            : "w-full gap-2 border-emerald/50 text-emerald hover:bg-emerald/10"
        }
      >
        {isVerified ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
        {isVerified ? "Suspend verification" : "Restore verification"}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isVerified ? "Suspend verification?" : "Restore verification?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isVerified
                ? `${companyName} will be removed from the buyer directory and its public profile will stop loading. Its record, documents and history are kept, and you can restore it at any time.`
                : `${companyName} will be listed in the buyer directory as GridLink Verified again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {hasAuditTrail ? (
            <Textarea
              rows={3}
              placeholder="Reason (optional) — internal, saved to the activity log…"
              value={reason}
              maxLength={1500}
              onChange={(e) => setReason(e.target.value)}
            />
          ) : null}
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={isVerified ? "destructive" : "default"}
              onClick={submit}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isVerified ? "Suspend verification" : "Restore verification"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
