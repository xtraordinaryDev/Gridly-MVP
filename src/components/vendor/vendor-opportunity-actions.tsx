"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { declineOpportunity, withdrawBid } from "@/app/vendor/(portal)/opportunities/actions"
import { Button } from "@/components/ui/button"

export function VendorOpportunityActions({ rfpId }: { rfpId: string }) {
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
            const res = await declineOpportunity(rfpId)
            if (res.ok) {
              toast.success("Declined")
              router.push("/vendor/opportunities")
              router.refresh()
            } else toast.error(res.message)
          })
        }}
      >
        Decline opportunity
      </Button>
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
