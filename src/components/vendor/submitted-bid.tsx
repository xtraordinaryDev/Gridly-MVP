"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import type { PricingMode, RfpResponseView } from "@/lib/rfp/types"
import { VendorBidForm } from "@/components/vendor/vendor-bid-form"
import { WithdrawBidButton } from "@/components/vendor/vendor-opportunity-actions"
import { Button } from "@/components/ui/button"

/** The vendor's submitted bid: a summary (children) that flips to the bid form while editing. */
export function SubmittedBid({
  rfpId,
  quantityGallons,
  pricingMode,
  indexName,
  preview,
  response,
  biddingOpen,
  children,
}: {
  rfpId: string
  quantityGallons: number
  pricingMode: PricingMode
  indexName: string | null
  preview: boolean
  response: RfpResponseView
  biddingOpen: boolean
  children: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)

  if (editing && biddingOpen) {
    return (
      <>
        <h2 className="font-semibold text-navy">Edit your bid</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Saving replaces the bid the buyer sees.</p>
        <VendorBidForm
          rfpId={rfpId}
          quantityGallons={quantityGallons}
          pricingMode={pricingMode}
          indexName={indexName}
          preview={preview}
          initial={response}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-navy">Your submitted bid</h2>
        {biddingOpen ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="size-3.5" />
            Edit bid
          </Button>
        ) : null}
      </div>
      {children}
      {biddingOpen ? <WithdrawBidButton rfpId={rfpId} /> : null}
    </>
  )
}
