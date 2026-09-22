"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, MapPin, Plus, Save, Trash2 } from "lucide-react"

import type { BuyerSite } from "@/lib/data/sites"
import { US_STATES } from "@/lib/schemas/vendor-application"
import { addSite, removeSite, updateBuyerProfile } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATE_ITEMS = US_STATES.map((s) => ({ value: s, label: s }))

export function ProfileForm({ fullName, companyName, email }: { fullName: string; companyName: string; email: string | null }) {
  const router = useRouter()
  const [name, setName] = useState(fullName)
  const [company, setCompany] = useState(companyName)
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-base font-semibold text-navy">Organization profile</h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            startTransition(async () => {
              const res = await updateBuyerProfile({ fullName: name, companyName: company })
              if (res.ok) {
                toast.success("Profile saved")
                router.refresh()
              } else toast.error(res.message)
            })
          }}
        >
          <label className="block text-sm font-medium">
            Your name
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-sm font-medium">
            Organization
            <Input value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Sign-in email
            <Input value={email ?? ""} disabled className="mt-1" />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              To change your password, use Forgot password on the sign-in page.
            </span>
          </label>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function SitesManager({ sites }: { sites: BuyerSite[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [state, setState] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-base font-semibold text-navy">Delivery sites</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved sites show up in the address picker when you create an RFP.
        </p>

        <ul className="mt-4 divide-y divide-border">
          {sites.length === 0 ? (
            <li className="py-3 text-sm text-muted-foreground">No saved sites yet.</li>
          ) : (
            sites.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.address}
                      {s.state ? ` · ${s.state}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await removeSite(s.id)
                      if (res.ok) {
                        toast.success("Site removed")
                        router.refresh()
                      } else toast.error(res.message)
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </li>
            ))
          )}
        </ul>

        <form
          className="mt-4 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault()
            startTransition(async () => {
              const res = await addSite({ name, address, state })
              if (res.ok) {
                toast.success("Site added")
                setName("")
                setAddress("")
                setState("")
                router.refresh()
              } else toast.error(res.message)
            })
          }}
        >
          <Input placeholder="Site name (e.g. North Depot)" value={name} onChange={(e) => setName(e.target.value)} className="sm:col-span-2" />
          <Input placeholder="Street, city, state ZIP" value={address} onChange={(e) => setAddress(e.target.value)} className="sm:col-span-2" />
          <Select value={state} onValueChange={(v) => setState(v ?? "")} items={STATE_ITEMS}>
            <SelectTrigger className="w-full"><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={isPending || !name || !address} className="gap-2">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add site
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
