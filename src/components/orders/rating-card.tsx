"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Star } from "lucide-react"

import type { SupplierRating } from "@/lib/data/ratings"
import { rateSupplier } from "@/app/buyer/(portal)/contracts/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function Stars({ value, size = "size-4", className }: { value: number; size?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(size, n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
      ))}
    </span>
  )
}

export function RatingCard({ contractId, vendorName, existing, editable }: { contractId: string; vendorName: string; existing: SupplierRating | null; editable: boolean }) {
  const router = useRouter()
  const [stars, setStars] = useState(existing?.stars ?? 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(existing?.comment ?? "")
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-base font-semibold text-navy">{editable ? `Rate ${vendorName}` : "Buyer rating"}</h2>
        {!editable ? (
          existing ? (
            <div className="mt-3">
              <Stars value={existing.stars} size="size-5" />
              {existing.comment ? <p className="mt-2 text-sm text-muted-foreground">“{existing.comment}”</p> : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">The buyer hasn&apos;t rated this contract yet.</p>
          )
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">Your rating shows on the supplier&apos;s profile and in bid comparisons for other buyers.</p>
            <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => setStars(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`} className="rounded p-0.5">
                  <Star className={cn("size-7 transition-colors", n <= (hover || stars) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                </button>
              ))}
              {stars ? <span className="ml-2 text-sm text-muted-foreground">{["", "Poor", "Fair", "Good", "Very good", "Excellent"][stars]}</span> : null}
            </div>
            <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Delivery reliability, communication, paperwork…" className="mt-3" />
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                disabled={isPending || !stars}
                className="gap-2"
                onClick={() =>
                  startTransition(async () => {
                    const res = await rateSupplier({ contractId, stars, comment })
                    if (res.ok) {
                      toast.success(existing ? "Rating updated" : "Thanks for rating")
                      router.refresh()
                    } else toast.error(res.message)
                  })
                }
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Star className="size-4" />}
                {existing ? "Update rating" : "Submit rating"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/** Compact performance summary used in comparisons and profiles. */
export function PerformanceBadges({ avgStars, ratingCount, onTimePct, awardsCount, className }: { avgStars: number | null; ratingCount: number; onTimePct: number | null; awardsCount: number; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs", className)}>
      {avgStars != null ? (
        <span className="inline-flex items-center gap-1"><Stars value={avgStars} size="size-3.5" /><span className="font-medium">{avgStars.toFixed(1)}</span><span className="text-muted-foreground">({ratingCount})</span></span>
      ) : (
        <span className="text-muted-foreground">No ratings yet</span>
      )}
      {onTimePct != null ? <span className={cn("font-medium", onTimePct >= 90 ? "text-emerald" : onTimePct >= 75 ? "text-amber-700" : "text-red-700")}>{onTimePct}% on time</span> : null}
      <span className="text-muted-foreground">{awardsCount} award{awardsCount === 1 ? "" : "s"}</span>
    </div>
  )
}
