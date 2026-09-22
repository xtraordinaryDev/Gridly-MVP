import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "@/lib/invoicing/types"

const CONFIG: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-brand-blue/10 text-brand-blue",
  viewed: "bg-navy/10 text-navy",
  disputed: "bg-red-100 text-red-800",
  partially_paid: "bg-amber-100 text-amber-800",
  paid: "bg-emerald/15 text-emerald",
  void: "bg-muted text-muted-foreground line-through",
}

export function InvoiceStatusBadge({
  status,
  overdue,
  className,
}: {
  status: InvoiceStatus
  overdue?: boolean
  className?: string
}) {
  if (overdue) {
    return (
      <Badge className={cn("gap-1 bg-red-100 text-red-800", className)}>
        <AlertTriangle className="size-3" />
        Overdue
      </Badge>
    )
  }
  return <Badge className={cn(CONFIG[status], className)}>{INVOICE_STATUS_LABEL[status]}</Badge>
}
