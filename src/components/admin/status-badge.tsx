import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { ApplicationStatus } from "@/lib/data/applications"

const CONFIG: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  pending_review: {
    label: "Pending Review",
    className: "bg-amber-100 text-amber-700",
  },
  info_requested: {
    label: "Info Requested",
    className: "bg-brand-blue/10 text-brand-blue",
  },
  approved: { label: "Approved", className: "bg-emerald/15 text-emerald" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
}

export function StatusBadge({
  status,
  className,
  size = "default",
}: {
  status: ApplicationStatus
  className?: string
  size?: "default" | "lg"
}) {
  const config = CONFIG[status]
  return (
    <Badge
      className={cn(
        config.className,
        size === "lg" && "px-3 py-1 text-sm",
        className
      )}
    >
      {config.label}
    </Badge>
  )
}

export function SourceBadge({ source }: { source: "invited" | "self_applied" }) {
  return (
    <Badge
      variant="secondary"
      className="bg-muted font-normal text-muted-foreground"
    >
      {source === "invited" ? "Invited" : "Self-applied"}
    </Badge>
  )
}
