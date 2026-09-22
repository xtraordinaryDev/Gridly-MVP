import { AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/schemas/orders"
import { cn } from "@/lib/utils"

const CONFIG: Record<OrderStatus, string> = {
  requested: "bg-brand-blue/10 text-brand-blue",
  confirmed: "bg-navy/10 text-navy",
  scheduled: "bg-amber-100 text-amber-800",
  delivered: "bg-emerald/15 text-emerald",
  cancelled: "bg-muted text-muted-foreground line-through",
}

export function OrderStatusBadge({ status, late, urgency, className }: { status: OrderStatus; late?: boolean; urgency?: string; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <Badge className={CONFIG[status]}>{ORDER_STATUS_LABEL[status]}</Badge>
      {late ? (
        <Badge className="gap-1 bg-red-100 text-red-800"><AlertTriangle className="size-3" />Late</Badge>
      ) : null}
      {urgency === "emergency" ? <Badge variant="destructive">Emergency</Badge> : urgency === "rush" ? <Badge className="bg-amber-100 text-amber-800">Rush</Badge> : null}
    </span>
  )
}
