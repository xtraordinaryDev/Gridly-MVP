import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { InviteForm } from "./invite-form"

export default function InviteSupplierPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/applications"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Back to applications
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Invite a supplier
        </h1>
        <p className="mt-1 text-muted-foreground">
          Create a token-gated onboarding link and send it directly to a
          supplier. They&apos;ll complete the full vendor registration.
        </p>
      </div>

      <InviteForm />
    </div>
  )
}
