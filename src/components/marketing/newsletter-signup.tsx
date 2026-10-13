"use client"

import { useState, useTransition } from "react"
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { subscribeToUpdates } from "@/app/updates/actions"
import { useBotCheck } from "@/components/marketing/bot-check"

/**
 * One-field sign-up for GridLink company updates. Used in the site footer;
 * `tone="dark"` styles it for the navy background.
 */
export function NewsletterSignup({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  const { field, meta } = useBotCheck()
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const dark = tone === "dark"

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await subscribeToUpdates({ email }, meta())
      if (res.ok) setDone(true)
      else setError(res.message)
    })
  }

  if (done) {
    return (
      <p className={cn("flex items-center gap-2 text-sm", dark ? "text-white/80" : "text-foreground", className)} role="status">
        <CheckCircle2 className="size-4 shrink-0 text-emerald" />
        You&rsquo;re on the list. We send a short update about once a month.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className={cn("relative", className)} noValidate>
      {field}
      <label htmlFor="newsletter-email" className={cn("block text-sm font-semibold", dark ? "text-white" : "text-navy")}>
        Get GridLink updates
      </label>
      <p className={cn("mt-1 text-xs", dark ? "text-white/60" : "text-muted-foreground")}>
        Product news and fuel market notes, about once a month. No spam, unsubscribe any time.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "newsletter-error" : undefined}
          className={cn(
            "h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm outline-none transition-colors",
            dark
              ? "border-white/15 bg-white/10 text-white placeholder:text-white/40 focus:border-brand-blue focus:bg-white/15"
              : "border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-brand-blue"
          )}
        />
        <button
          type="submit"
          disabled={isPending || !email}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue/90 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Subscribe
          {!isPending ? <ArrowRight className="size-4" /> : null}
        </button>
      </div>
      {error ? (
        <p id="newsletter-error" className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
