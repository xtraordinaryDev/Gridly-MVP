import { Check } from "lucide-react"

export function CheckmarkList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">None listed</p>
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
