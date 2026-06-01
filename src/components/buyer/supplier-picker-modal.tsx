"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import type { DirectoryVendor } from "@/lib/directory/shared"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function SupplierPickerModal({
  open,
  onOpenChange,
  vendors,
  selectedIds,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendors: DirectoryVendor[]
  selectedIds: string[]
  onConfirm: (ids: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedIds))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter((v) =>
      `${v.companyName} ${v.states.join(" ")} ${v.products.join(" ")}`
        .toLowerCase()
        .includes(q)
    )
  }, [vendors, query])

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose suppliers</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search verified suppliers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-border rounded-lg border border-border">
          {filtered.map((v) => (
            <li key={v.id}>
              <label className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/40">
                <Checkbox
                  checked={picked.has(v.id)}
                  onCheckedChange={() => toggle(v.id)}
                />
                <span>
                  <span className="font-medium text-navy">{v.companyName}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {v.states.slice(0, 4).join(", ")}
                    {v.states.length > 4 ? "…" : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm([...picked])
              onOpenChange(false)
            }}
          >
            Confirm ({picked.size})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
