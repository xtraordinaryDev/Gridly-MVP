"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import type { BuyerRfpDetail, RfpResponseView } from "@/lib/rfp/types"
import { awardContract } from "@/app/buyer/(portal)/rfps/actions"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const ROWS: { key: string; label: string; render: (r: RfpResponseView) => React.ReactNode }[] = [
  {
    key: "ppg",
    label: "Price / gallon",
    render: (r) => `$${r.pricePerGallon.toFixed(4)}`,
  },
  {
    key: "total",
    label: "Total price",
    render: (r) => `$${r.totalPrice.toLocaleString()}`,
  },
  {
    key: "terms",
    label: "Delivery terms",
    render: (r) => r.deliveryTerms,
  },
  {
    key: "validity",
    label: "Validity",
    render: (r) => `${r.validityDays} days`,
  },
  {
    key: "notes",
    label: "Notes",
    render: (r) => r.notes ?? "—",
  },
]

export function RfpComparisonTable({
  rfp,
  canAward,
}: {
  rfp: BuyerRfpDetail
  canAward: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [awardVendor, setAwardVendor] = useState<RfpResponseView | null>(null)

  const lowestTotal = useMemo(() => {
    if (!rfp.responses.length) return null
    return Math.min(...rfp.responses.map((r) => r.totalPrice))
  }, [rfp.responses])

  if (!rfp.responses.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        No bids received yet. Invited suppliers can submit responses until the due date.
      </p>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Metric
              </th>
              {rfp.responses.map((r) => (
                <th
                  key={r.vendorId}
                  className={cn(
                    "min-w-[10rem] px-4 py-3 text-left font-semibold text-navy",
                    r.totalPrice === lowestTotal && "bg-emerald/5"
                  )}
                >
                  {r.companyName}
                  {r.totalPrice === lowestTotal ? (
                    <span className="ml-2 text-xs font-medium text-emerald">Lowest</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-b border-border">
                <td className="px-4 py-3 font-medium text-muted-foreground">{row.label}</td>
                {rfp.responses.map((r) => (
                  <td
                    key={`${row.key}-${r.vendorId}`}
                    className={cn(
                      "px-4 py-3",
                      row.key === "total" &&
                        r.totalPrice === lowestTotal &&
                        "bg-emerald/5 font-semibold text-emerald"
                    )}
                  >
                    {row.render(r)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-4 py-3 font-medium text-muted-foreground">Profile</td>
              {rfp.responses.map((r) => (
                <td key={`profile-${r.vendorId}`} className="px-4 py-3">
                  <Link
                    href={`/buyer/directory/${r.vendorId}`}
                    className="text-brand-blue hover:underline"
                  >
                    View profile
                  </Link>
                </td>
              ))}
            </tr>
            {canAward && rfp.status === "published" ? (
              <tr>
                <td className="px-4 py-3 font-medium text-muted-foreground">Action</td>
                {rfp.responses.map((r) => (
                  <td key={`action-${r.vendorId}`} className="px-4 py-3">
                    <button
                      type="button"
                      className={cn(buttonVariants({ size: "sm" }))}
                      disabled={pending}
                      onClick={() => setAwardVendor(r)}
                    >
                      Award contract
                    </button>
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!awardVendor} onOpenChange={(o) => !o && setAwardVendor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Award contract?</AlertDialogTitle>
            <AlertDialogDescription>
              Award this RFP to {awardVendor?.companyName}? This will update the RFP status and
              notify the supplier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                if (!awardVendor) return
                startTransition(async () => {
                  const res = await awardContract(rfp.id, awardVendor.vendorId)
                  if (res.ok) {
                    toast.success("Contract awarded")
                    setAwardVendor(null)
                    window.location.reload()
                  } else {
                    toast.error(res.message)
                  }
                })
              }}
            >
              Confirm award
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
