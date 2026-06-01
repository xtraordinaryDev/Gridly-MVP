import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { RfpStatus } from "@/lib/rfp/types"

const CONFIG: Record<RfpStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  published: { label: "Published", className: "bg-brand-blue/10 text-brand-blue" },
  closed: { label: "Closed", className: "bg-amber-100 text-amber-800" },
  awarded: { label: "Awarded", className: "bg-emerald/15 text-emerald" },
}

export function RfpStatusBadge({
  status,
  className,
}: {
  status: RfpStatus
  className?: string
}) {
  const c = CONFIG[status]
  return <Badge className={cn(c.className, className)}>{c.label}</Badge>
}
