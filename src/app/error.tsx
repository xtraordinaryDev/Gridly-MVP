"use client"

import { ErrorState } from "@/components/error-state"

export default function RootError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  reset?: () => void
  unstable_retry?: () => void
}) {
  return <ErrorState error={error} retry={unstable_retry ?? reset} />
}
