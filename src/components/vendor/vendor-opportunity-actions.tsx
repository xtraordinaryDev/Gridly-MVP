"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { declineOpportunity, withdrawBid } from "@/app/vendor/(portal)/opportunities/actions"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function VendorOpportunityActions({ rfpId }: { rfpId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="mt-6 border-t border-border pt-4">
      <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirmOpen(true)}>
        Decline opportunity
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this opportunity?</AlertDialogTitle>
            <AlertDialogDescription>
              The buyer will see that you declined, and you won&apos;t be able to bid on this RFP afterwards. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirmOpen(false)}>
              Keep opportunity
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              className="gap-2"
              onClick={() => {
                startTransition(async () => {
                  const res = await declineOpportunity(rfpId)
                  if (res.ok) {
                    toast.success("Declined")
                    router.push("/vendor/opportunities")
                    router.refresh()
                  } else {
                    toast.error(res.message)
                    setConfirmOpen(false)
                  }
                })
              }}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Decline opportunity
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function WithdrawBidButton({ rfpId }: { rfpId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  return (
    <div className="mt-6 border-t border-border pt-4">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const res = await withdrawBid(rfpId)
            if (res.ok) {
              toast.success("Bid withdrawn")
              router.refresh()
            } else toast.error(res.message)
          })
        }}
      >
        Withdraw bid
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">You can submit a new bid until the deadline.</p>
    </div>
  )
}
