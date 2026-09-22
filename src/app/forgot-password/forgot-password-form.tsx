"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Loader2, MailCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requestPasswordReset } from "./actions"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald/15 text-emerald">
          <MailCheck className="size-6" />
        </span>
        <p className="text-sm text-foreground">
          If an account exists for <strong>{email}</strong>, a reset link is on its way. The link expires in one hour.
        </p>
        <Link href="/login" className="text-sm font-medium text-brand-blue hover:underline">Back to sign in</Link>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
          const res = await requestPasswordReset({ email })
          if (res.ok) setSent(true)
          else setError(res.message)
        })
      }}
    >
      <label className="block text-sm font-medium">
        Email
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1" required />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={isPending} className="w-full gap-2">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Send reset link
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-brand-blue hover:underline">Sign in</Link>
      </p>
    </form>
  )
}
