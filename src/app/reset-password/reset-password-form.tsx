"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updatePassword } from "./actions"

export function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
          const res = await updatePassword({ password, confirmPassword: confirm })
          if (res.ok) {
            toast.success("Password updated")
            window.location.assign(res.redirectTo)
          } else setError(res.message)
        })
      }}
    >
      <label className="block text-sm font-medium">
        New password
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-1" required minLength={8} />
      </label>
      <label className="block text-sm font-medium">
        Confirm password
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" className="mt-1" required />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={isPending} className="w-full gap-2">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Update password
      </Button>
    </form>
  )
}
