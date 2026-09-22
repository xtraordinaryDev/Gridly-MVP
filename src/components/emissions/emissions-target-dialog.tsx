"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Target } from "lucide-react"

import { saveEmissionsTarget } from "@/app/buyer/(portal)/dashboard/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function EmissionsTargetDialog({
  year,
  current,
  note,
  tonsYtd,
}: {
  year: number
  current: number | null
  note: string | null
  tonsYtd: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tons, setTons] = useState(current != null ? String(current) : "")
  const [text, setText] = useState(note ?? "")
  const [isPending, startTransition] = useTransition()

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Target className="size-4" />
        {current != null ? "Edit target" : "Set target"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{year} emissions target</DialogTitle>
            <DialogDescription>
              Total Scope 1 CO2e from purchased fuel you want to stay under this year. You are at{" "}
              <strong>{tonsYtd.toLocaleString("en-US", { maximumFractionDigits: 0 })} t</strong> so far.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Target (metric tons CO2e)
              <Input type="number" min={0} step="1" value={tons} onChange={(e) => setTons(e.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm font-medium">
              Note (optional)
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 10% below last year" className="mt-1" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const res = await saveEmissionsTarget({ year, targetTons: Number(tons), note: text })
                  if (res.ok) {
                    toast.success("Target saved")
                    setOpen(false)
                    router.refresh()
                  } else toast.error(res.message)
                })
              }
              className="gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Target className="size-4" />}
              Save target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
