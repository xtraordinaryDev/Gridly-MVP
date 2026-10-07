import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download, FileText, Globe, ShieldCheck, ShieldOff } from "lucide-react"

import { requireAdmin } from "@/lib/auth"
import { getAdminVendor } from "@/lib/data/admin-vendors"
import { DOCUMENT_TYPES } from "@/lib/data/documents"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { VerificationActions } from "./verification-actions"

export const metadata: Metadata = { title: "Vendor — GridLink Admin" }

function formatDate(value: string | null) {
  if (!value) return "—"
  // Expiry is a bare calendar day; noon UTC keeps it on that day in US timezones.
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value).toLocaleDateString("en-US", {
    timeZone: value.length === 10 ? "UTC" : "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground [overflow-wrap:anywhere]">
        {value === null || value === undefined || value === "" ? <span className="text-muted-foreground">—</span> : value}
      </dd>
    </div>
  )
}

function Tags({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="bg-muted font-normal">
          {item}
        </Badge>
      ))}
    </div>
  )
}

export default async function AdminVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { preview } = await requireAdmin()
  const { id } = await params
  const vendor = await getAdminVendor(id)
  if (!vendor) notFound()

  const label = (type: string) => DOCUMENT_TYPES.find((t) => t.type === type)?.label ?? type

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/admin/vendors"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Back to vendors
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-navy [overflow-wrap:anywhere]">{vendor.companyName}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {vendor.isVerified ? (
            <Badge className="gap-1 bg-emerald/15 text-emerald">
              <ShieldCheck className="size-3.5" /> GridLink Verified
            </Badge>
          ) : (
            <Badge className="gap-1 bg-destructive/10 text-destructive">
              <ShieldOff className="size-3.5" /> Verification suspended
            </Badge>
          )}
          {vendor.verifiedAt ? <span>Verified {formatDate(vendor.verifiedAt)}</span> : null}
          {vendor.isDemo ? <Badge variant="secondary" className="bg-muted font-normal text-muted-foreground">Demo data</Badge> : null}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-sm font-semibold text-navy">Company</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Corporate address" value={vendor.corporateAddress} />
                <Field
                  label="Website"
                  value={
                    vendor.websiteUrl ? (
                      <a href={vendor.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-blue hover:underline">
                        <Globe className="size-3.5 shrink-0" />
                        {vendor.websiteUrl}
                      </a>
                    ) : null
                  }
                />
                <Field label="Entity type" value={vendor.entityType} />
                <Field label="State of incorporation" value={vendor.stateOfIncorporation} />
                <Field label="Year founded" value={vendor.yearFounded} />
                <Field label="US DOT number" value={vendor.usDotNumber} />
                <Field label="Special certification" value={vendor.specialCertification} />
                <Field label="Annual gallons distributed" value={vendor.annualGallons ? vendor.annualGallons.toLocaleString("en-US") : null} />
                <Field label="Fleet" value={vendor.tankwagons == null && vendor.transports == null ? null : `${vendor.tankwagons ?? 0} tankwagons · ${vendor.transports ?? 0} transports`} />
                <Field label="Lead time" value={[vendor.standardOrderLeadTime && `Standard ${vendor.standardOrderLeadTime}`, vendor.emergencyOrderLeadTime && `Emergency ${vendor.emergencyOrderLeadTime}`].filter(Boolean).join(" · ")} />
                <div className="sm:col-span-2">
                  <Field label="Organization type" value={<Tags items={vendor.organizationType} />} />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Products" value={<Tags items={vendor.products} />} />
                </div>
                <div className="sm:col-span-2">
                  <Field label={vendor.nationwide ? "Licensed states (serves nationwide)" : "Licensed states"} value={<Tags items={vendor.states} />} />
                </div>
                {vendor.deliveryCapabilities.length ? (
                  <div className="sm:col-span-2">
                    <Field label="Delivery capabilities" value={<Tags items={vendor.deliveryCapabilities} />} />
                  </div>
                ) : null}
                {vendor.description ? (
                  <div className="sm:col-span-2">
                    <Field label="Description" value={vendor.description} />
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-navy">Compliance documents</h2>
              {vendor.missingDocuments.length ? (
                <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Missing required: {vendor.missingDocuments.join(", ")}
                </p>
              ) : null}
              {vendor.documents.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No documents on file.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {vendor.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                          <FileText className="size-4.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {label(doc.type)}
                            {doc.isExpired ? (
                              <Badge className="bg-red-100 normal-case text-red-800">Expired</Badge>
                            ) : doc.expiresSoon ? (
                              <Badge className="bg-amber-100 normal-case text-amber-800">Expires soon</Badge>
                            ) : (
                              <Badge className="bg-emerald/15 normal-case text-emerald">On file</Badge>
                            )}
                          </p>
                          <p className="truncate text-sm font-medium text-foreground" title={doc.fileName}>{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {formatDate(doc.uploadedAt)} · {doc.expiresAt ? `Expires ${formatDate(doc.expiresAt)}` : "No expiry recorded"}
                          </p>
                        </div>
                      </div>
                      {preview ? (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">Sample</Badge>
                      ) : (
                        <a
                          href={`/admin/vendors/${vendor.id}/document/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-navy transition-colors hover:bg-muted"
                        >
                          <Download className="size-3.5" />
                          View
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-navy">Verification</h2>
              <dl className="space-y-3">
                <Field label="Status" value={vendor.isVerified ? "Verified — visible to buyers" : "Suspended — hidden from buyers"} />
                <Field label="Verified on" value={formatDate(vendor.verifiedAt)} />
                <Field label="Login email" value={vendor.loginEmail ?? (vendor.hasLogin ? "Account linked" : "No account created yet")} />
                {vendor.applicationId ? (
                  <Field
                    label="Application"
                    value={
                      <Link href={`/admin/applications/${vendor.applicationId}`} className="text-brand-blue hover:underline">
                        View application &amp; activity
                      </Link>
                    }
                  />
                ) : null}
              </dl>
              <VerificationActions
                vendorId={vendor.id}
                companyName={vendor.companyName}
                isVerified={vendor.isVerified}
                hasAuditTrail={Boolean(vendor.applicationId)}
                preview={preview}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-navy">Marketplace activity</h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  ["RFP invitations", vendor.rfpInvitations],
                  ["Bids submitted", vendor.bidsSubmitted],
                  ["Awards", vendor.contractsAwarded],
                ].map(([name, value]) => (
                  <div key={name as string}>
                    <p className="text-2xl font-bold text-navy">{value}</p>
                    <p className="text-xs text-muted-foreground">{name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
