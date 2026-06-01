import { CheckCircle2, FileText, Upload } from "lucide-react"

import { getCurrentVendor } from "@/lib/data/vendor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const DOCS = [
  { type: "W-9", required: true, onFile: true, name: "W9-Apex-2026.pdf" },
  { type: "Certificate of Insurance", required: true, onFile: true, name: "COI-Apex-2026.pdf" },
  { type: "Distributor License", required: false, onFile: true, name: "IL-Distributor-License.pdf" },
  { type: "Company Logo", required: false, onFile: false, name: null },
]

export default async function VendorDocumentsPage() {
  const vendor = await getCurrentVendor()
  if (!vendor) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Your verification documents on file. Keep insurance current to stay
          GridLink Verified.
        </p>
      </div>

      <div className="space-y-3">
        {DOCS.map((doc) => (
          <Card key={doc.type}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                    doc.onFile
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {doc.type}
                    {doc.required ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        Required
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {doc.name ?? "Not uploaded"}
                  </p>
                </div>
              </div>
              {doc.onFile ? (
                <Badge className="gap-1 bg-emerald/15 text-emerald">
                  <CheckCircle2 className="size-3" />
                  On file
                </Badge>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5" disabled>
                  <Upload className="size-3.5" />
                  Upload
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Document re-upload and expiry tracking are managed by the GridLink team
        during this phase. Contact support to update a document.
      </p>
    </div>
  )
}
