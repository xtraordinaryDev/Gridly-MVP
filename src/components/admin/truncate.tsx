import { cn } from "@/lib/utils"

/** One line, capped width, full value on hover — so a single long value can't blow out a table. */
export function Truncate({
  children,
  className,
}: {
  children: string | null | undefined
  className?: string
}) {
  if (!children) return <span className="text-muted-foreground">—</span>
  return (
    <span title={children} className={cn("block max-w-[16rem] truncate", className)}>
      {children}
    </span>
  )
}
