"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Loader2, Send } from "lucide-react"

import type { ContractSummary } from "@/lib/invoicing/types"
import type { AddressOptions } from "@/lib/data/sites"
import { placeOrder } from "@/app/buyer/(portal)/orders/actions"
import { AddressCombobox } from "@/components/buyer/address-combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const URGENCY = [
  { value: "standard", label: "Standard", hint: "Within the window below" },
  { value: "rush", label: "Rush", hint: "Within 48 hours" },
  { value: "emergency", label: "Emergency", hint: "Within 24 hours; supplier is paged immediately" },
] as const

function plusDays(n: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function PlaceOrderForm({
  contracts,
  addresses,
  defaultContractId,
  defaultUrgency = "standard",
  compact = false,
  onDone,
}: {
  contracts: ContractSummary[]
  addresses: AddressOptions
  defaultContractId?: string
  defaultUrgency?: "standard" | "rush" | "emergency"
  compact?: boolean
  onDone?: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [contractId, setContractId] = useState(defaultContractId ?? contracts[0]?.id ?? "")
  const [urgency, setUrgency] = useState<"standard" | "rush" | "emergency">(defaultUrgency)
  const [siteAddress, setSiteAddress] = useState("")
  const [gallons, setGallons] = useState("")
  const [windowStart, setWindowStart] = useState(plusDays(defaultUrgency === "emergency" ? 0 : 2))
  const [windowEnd, setWindowEnd] = useState(plusDays(defaultUrgency === "emergency" ? 1 : 5))
  const [notes, setNotes] = useState("")

  const contract = contracts.find((c) => c.id === contractId)
  const contractItems = useMemo(() => contracts.map((c) => ({ value: c.id, label: `${c.title} — ${c.vendorName}` })), [contracts])

  function setUrgencyAndWindow(u: typeof urgency) {
    setUrgency(u)
    if (u === "emergency") { setWindowStart(plusDays(0)); setWindowEnd(plusDays(1)) }
    else if (u === "rush") { setWindowStart(plusDays(0)); setWindowEnd(plusDays(2)) }
  }

  if (!contracts.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Orders are placed against an awarded contract. Award an RFP first, then come back here.
        </CardContent>
      </Card>
    )
  }

  return (
    <form
      className={cn("space-y-4", !compact && "max-w-2xl")}
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const res = await placeOrder({ contractId, siteAddress, gallons: Number(gallons), windowStart, windowEnd, urgency, notes })
          if (res.ok) {
            toast.success(urgency === "emergency" ? "Emergency order sent to supplier" : "Order placed")
            onDone?.()
            router.push(`/buyer/contracts/${contractId}`)
            router.refresh()
          } else toast.error(res.message)
        })
      }}
    >
      {urgency === "emergency" ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>Emergency orders email the supplier immediately and are flagged at the top of their queue. Use for outages, storm response, or tanks under 10%.</p>
        </div>
      ) : null}

      <label className="block text-sm font-medium">
        Contract
        <Select value={contractId} onValueChange={(v) => setContractId(v ?? "")} items={contractItems}>
          <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Select a contract" /></SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.title} — {c.vendorName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {contract ? (
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            {contract.fuelType} · {contract.pricingMode === "index" ? `${contract.indexName ?? "Index"} ${contract.differential != null ? ((contract.differential >= 0 ? "+ $" : "− $") + Math.abs(contract.differential).toFixed(4)) : ""}` : `$${contract.pricePerGallon.toFixed(4)}/gal`} · Net {contract.netDays}
          </span>
        ) : null}
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        {URGENCY.map((u) => (
          <button
            key={u.value}
            type="button"
            onClick={() => setUrgencyAndWindow(u.value)}
            className={cn(
              "rounded-xl border p-3 text-left text-sm transition-colors",
              urgency === u.value ? (u.value === "emergency" ? "border-red-500 bg-red-50" : "border-brand-blue bg-brand-blue/5") : "border-border hover:bg-muted/40"
            )}
          >
            <span className="block font-medium">{u.label}</span>
            <span className="block text-xs text-muted-foreground">{u.hint}</span>
          </button>
        ))}
      </div>

      <div>
        <span className="text-sm font-medium">Delivery site</span>
        <div className="mt-1">
          <AddressCombobox value={siteAddress} onChange={(a) => setSiteAddress(a)} options={addresses} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Gallons
          <Input type="number" min={0} step="1" value={gallons} onChange={(e) => setGallons(e.target.value)} className="mt-1" required />
        </label>
        <label className="block text-sm font-medium">
          Earliest
          <Input type="date" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className="mt-1" required />
        </label>
        <label className="block text-sm font-medium">
          Latest
          <Input type="date" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className="mt-1" required />
        </label>
      </div>

      <label className="block text-sm font-medium">
        Notes for the driver (optional)
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Gate code, tank location, contact on site…" />
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !contractId || !siteAddress || !gallons} className={cn("gap-2", urgency === "emergency" && "bg-red-600 hover:bg-red-700")}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {urgency === "emergency" ? "Send emergency order" : "Place order"}
        </Button>
      </div>
    </form>
  )
}
