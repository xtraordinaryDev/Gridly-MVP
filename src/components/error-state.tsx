"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Shared body for route error boundaries. */
export function ErrorState({
  error,
  retry,
  compact = false,
}: {
  error: Error & { digest?: string }
  retry?: () => void
  compact?: boolean
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={compact ? "mx-auto max-w-lg py-16 text-center" : "flex min-h-screen flex-col items-center justify-center bg-accent/30 px-4 text-center"}>
      <span className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
        <AlertTriangle className="size-6" />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-navy">Something went wrong</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        We hit an unexpected error loading this page. Try again, and if it keeps happening let the GridLink team know.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
      <div className="mt-6 flex justify-center gap-2">
        {retry ? (
          <Button onClick={retry} className="gap-2">
            <RotateCcw className="size-4" />
            Try again
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => window.location.assign("/")}>Go home</Button>
      </div>
    </div>
  )
}
