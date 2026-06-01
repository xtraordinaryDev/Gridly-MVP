import { Shield } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatProfileDate } from "@/lib/directory/profile"

export function GridLinkVerifiedBadge({
  verifiedAt,
  lastReviewedAt,
  className,
  size = "default",
}: {
  verifiedAt: string
  lastReviewedAt: string
  className?: string
  size?: "default" | "compact"
}) {
  const compact = size === "compact"

  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center rounded-2xl border-2 border-emerald/40 bg-gradient-to-b from-emerald/20 via-emerald/10 to-emerald/5 px-4 py-3 shadow-sm",
        compact && "rounded-xl px-3 py-2",
        className
      )}
    >
      <div
        className={cn(
          "absolute -top-1 left-1/2 size-3 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-emerald/50 bg-emerald/10",
          compact && "size-2"
        )}
        aria-hidden
      />
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-full border-2 border-emerald bg-emerald/15 text-emerald shadow-inner",
          compact && "size-10"
        )}
      >
        <Shield className={cn("size-8 fill-emerald/20", compact && "size-5")} strokeWidth={1.75} />
      </div>
      <p
        className={cn(
          "mt-2 text-center text-xs font-bold uppercase tracking-wider text-emerald",
          compact && "mt-1.5 text-[10px]"
        )}
      >
        GridLink Verified
      </p>
      {!compact ? (
        <div className="mt-1.5 space-y-0.5 text-center text-[10px] leading-tight text-emerald/90">
          <p>Verified {formatProfileDate(verifiedAt)}</p>
          <p>Last reviewed {formatProfileDate(lastReviewedAt)}</p>
        </div>
      ) : null}
    </div>
  )
}
