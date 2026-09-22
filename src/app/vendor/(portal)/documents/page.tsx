import { AlertTriangle, CheckCircle2, Download, FileText } from "lucide-react"

import { requireVendor } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { getCurrentVendor } from "@/lib/data/vendor"
import { DOCUMENT_TYPES, listVendorDocuments } from "@/lib/data/documents"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DocumentUploader } from "./document-uploader"
import { openDocument } from "./actions"

function fmt(d: string) {
  return new Date(d.length === 10 ? d + "T12:00:00Z" : d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function VendorDocumentsPage() {
  const { profile, preview } = await requireVendor()
  const vendor = await getCurrentVendor()
  if (!vendor) return null
  const vendorId = await resolveVendorIdForSession(profile.id, preview)
  const docs = await listVendorDocuments(vendorId)
  const byType = new Map(docs.map((d) => [d.type, d]))
  const missingRequired = DOCUMENT_TYPES.filter((t) => t.required && !byType.get(t.type)).length
  const expired = docs.filter((d) => d.isExpired).length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Your verification documents on file. Keep insurance current to stay GridLink Verified.
        </p>
      </div>

      {missingRequired || expired ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {missingRequired ? `${missingRequired} required document${missingRequired === 1 ? " is" : "s are"} missing. ` : ""}
          {expired ? `${expired} document${expired === 1 ? " has" : "s have"} expired. ` : ""}
          Upload current copies to keep your verified status.
        </p>
      ) : null}

      <div className="space-y-3">
        {DOCUMENT_TYPES.map((t) => {
          const doc = byType.get(t.type)
          return (
            <Card key={t.type}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", doc ? (doc.isExpired ? "bg-red-100 text-red-700" : "bg-emerald/15 text-emerald") : "bg-muted text-muted-foreground")}>
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {t.label}
                      {t.required ? <span className="text-xs font-normal text-muted-foreground">Required</span> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doc ? (
                        <>
                          {doc.fileName} · uploaded {fmt(doc.uploadedAt)}
                          {doc.expiresAt ? ` · expires ${fmt(doc.expiresAt)}` : ""}
                        </>
                      ) : (
                        t.hint
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {doc ? (
                    doc.isExpired ? (
                      <Badge className="gap-1 bg-red-100 text-red-800"><AlertTriangle className="size-3" />Expired</Badge>
                    ) : doc.expiresSoon ? (
                      <Badge className="gap-1 bg-amber-100 text-amber-800"><AlertTriangle className="size-3" />Expires soon</Badge>
                    ) : (
                      <Badge className="gap-1 bg-emerald/15 text-emerald"><CheckCircle2 className="size-3" />On file</Badge>
                    )
                  ) : null}
                  {doc && !preview ? (
                    <form action={openDocument.bind(null, doc.id)}>
                      <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                        <Download className="size-3.5" />
                        View
                      </button>
                    </form>
                  ) : null}
                  <DocumentUploader vendorId={vendorId} type={t.type} hasExpiry={t.hasExpiry} replace={!!doc} preview={preview} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        PDF, PNG, or JPG up to 10 MB. Documents are private to you and the GridLink verification team.
      </p>
    </div>
  )
}
