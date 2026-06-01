import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { InvitationStatus } from "@/lib/rfp/types"

const CONFIG: Record<InvitationStatus, { label: string; className: string }> = {
  invited: { label: "New", className: "bg-brand-blue/10 text-brand-blue" },
  viewed: { label: "Viewed", className: "bg-amber-100 text-amber-700" },
  responded: { label: "Responded", className: "bg-emerald/15 text-emerald" },
  declined: { label: "Declined", className: "bg-muted text-muted-foreground" },
}

export function OpportunityStatusBadge({
  status,
  className,
}: {
  status: InvitationStatus
  className?: string
}) {
  const c = CONFIG[status]
  return <Badge className={cn(c.className, className)}>{c.label}</Badge>
}
