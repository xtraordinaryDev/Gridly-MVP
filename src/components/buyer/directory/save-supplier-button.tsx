"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BookmarkCheck, BookmarkPlus, Loader2 } from "lucide-react"

import { toggleSavedSupplier } from "@/app/buyer/(portal)/saved/actions"
import { Button } from "@/components/ui/button"

export function SaveSupplierButton({ vendorId, initialSaved }: { vendorId: string; initialSaved: boolean }) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  const toggle = () =>
    startTransition(async () => {
      const next = !saved
      const res = await toggleSavedSupplier(vendorId, next)
      if (!res.ok) return void toast.error(res.message)
      setSaved(next)
      toast.success(next ? "Saved to your list" : "Removed from your list")
      router.refresh()
    })

  return (
    <Button type="button" variant="outline" onClick={toggle} disabled={isPending} aria-pressed={saved}>
      {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? <BookmarkCheck className="size-4 text-brand-blue" /> : <BookmarkPlus className="size-4" />}
      {saved ? "Saved" : "Save to List"}
    </Button>
  )
}
