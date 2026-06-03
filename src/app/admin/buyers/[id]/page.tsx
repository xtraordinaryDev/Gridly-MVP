import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getBuyerApplication } from "@/lib/data/buyer-applications"
import { Card, CardContent } from "@/components/ui/card"
import { BuyerReviewActions } from "./buyer-review-actions"

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  )
}

export default async function BuyerApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const application = await getBuyerApplication(id)
  if (!application) notFound()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/admin/buyers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Back to buyers
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          {application.companyName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Buyer access request · submitted {formatDate(application.submittedAt)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
              <Field label="Organization" value={application.companyName} />
              <Field label="Industry" value={application.industry} />
              <Field label="Primary contact" value={application.fullName} />
              <Field label="Email" value={application.email} />
              <Field label="Phone" value={application.phone} />
              <Field label="Estimated annual volume" value={application.estimatedVolume} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                What they need GridLink for
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {application.useCase || "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <BuyerReviewActions
            application={application}
            preview={!isSupabaseConfigured()}
          />
        </div>
      </div>
    </div>
  )
}
