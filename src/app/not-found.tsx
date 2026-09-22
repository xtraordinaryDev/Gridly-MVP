import Link from "next/link"
import { Zap } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-accent/30 px-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-navy-foreground">
        <Zap className="size-6 fill-brand-blue text-brand-blue" />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-brand-blue">404</p>
      <h1 className="mt-2 text-2xl font-bold text-navy">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The link may be out of date, or the item may have been removed.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>Home</Link>
        <Link href="/login" className={cn(buttonVariants())}>Sign in</Link>
      </div>
    </main>
  )
}
