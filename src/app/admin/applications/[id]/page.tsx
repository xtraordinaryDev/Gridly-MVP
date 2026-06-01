import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download, FileText, Globe } from "lucide-react"

import { getApplication } from "@/lib/data/applications"
import type { ApplicationDetail } from "@/lib/data/applications"
import type { DocumentRef } from "@/lib/schemas/vendor-application"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { requireAdmin } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { SourceBadge } from "@/components/admin/status-badge"
import { ReviewActions } from "./review-actions"

function formatDate(value: string | null) {
  if (!value) return "Not submitted"
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          value
        )}
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

function docUrl(doc: DocumentRef, configured: boolean) {
  if (!configured) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  return `${base}/storage/v1/object/public/vendor-documents/${doc.path}`
}

function bytes(n: number) {
  if (!n) return "0 B"
  const u = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`
}

function DocumentCard({
  label,
  doc,
  configured,
}: {
  label: string
  doc?: DocumentRef | null
  configured: boolean
}) {
  if (!doc) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-border p-3.5">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">Not provided</p>
        </div>
      </div>
    )
  }

  const url = docUrl(doc, configured)
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <FileText className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {doc.name}
          </p>
          <p className="text-xs text-muted-foreground">{bytes(doc.size)}</p>
        </div>
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-navy transition-colors hover:bg-muted"
        >
          <Download className="size-3.5" />
          View
        </a>
      ) : (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Sample
        </Badge>
      )}
    </div>
  )
}

const SECTION_IDS = [
  "company",
  "documents",
  "contacts",
  "billing",
  "operations",
  "products",
  "capabilities",
  "states",
]

export default async function ApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { preview } = await requireAdmin()
  const { id } = await params
  const app: ApplicationDetail | null = await getApplication(id)
  if (!app) notFound()

  const configured = isSupabaseConfigured()

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/admin/applications"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Back to applications
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">
            {app.companyName}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            Submitted {formatDate(app.submittedAt)}
            <SourceBadge source={app.source} />
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: application data */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card px-5 shadow-sm">
            <Accordion multiple defaultValue={SECTION_IDS}>
              <AccordionItem value="company">
                <AccordionTrigger>Company Information</AccordionTrigger>
                <AccordionContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="Company name" value={app.companyName} />
                    <Field
                      label="Website"
                      value={
                        app.websiteUrl ? (
                          <a
                            href={app.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-blue hover:underline"
                          >
                            <Globe className="size-3.5" />
                            {app.websiteUrl}
                          </a>
                        ) : null
                      }
                    />
                    <Field label="Corporate address" value={app.corporateAddress} />
                    <Field
                      label="State of incorporation"
                      value={app.stateOfIncorporation}
                    />
                    <Field label="Entity type" value={app.entityType} />
                    <Field
                      label="Special certification"
                      value={app.specialCertification}
                    />
                    <Field label="US DOT number" value={app.usDotNumber} />
                    <Field label="Year founded" value={app.yearFounded} />
                    <Field
                      label="Nationwide"
                      value={app.nationwide ? "Yes" : "No"}
                    />
                    <Field
                      label="Annual volume (range)"
                      value={app.annualGallonsRange}
                    />
                    <div className="sm:col-span-2">
                      <Field
                        label="Organization type"
                        value={<Tags items={app.organizationType} />}
                      />
                    </div>
                    {app.description ? (
                      <div className="sm:col-span-2">
                        <Field label="Description" value={app.description} />
                      </div>
                    ) : null}
                  </dl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="documents">
                <AccordionTrigger>Documents</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DocumentCard
                      label="W-9"
                      doc={app.documents.w9Form}
                      configured={configured}
                    />
                    <DocumentCard
                      label="Certificate of Insurance"
                      doc={app.documents.certificateOfInsurance}
                      configured={configured}
                    />
                    <DocumentCard
                      label="Distributor License"
                      doc={app.documents.distributorLicense}
                      configured={configured}
                    />
                    <DocumentCard
                      label="Company Logo"
                      doc={app.documents.companyLogo}
                      configured={configured}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contacts">
                <AccordionTrigger>Contacts</AccordionTrigger>
                <AccordionContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Sales rep"
                      value={[app.salesRepFirstName, app.salesRepLastName]
                        .filter(Boolean)
                        .join(" ")}
                    />
                    <Field label="Sales rep email" value={app.salesRepEmail} />
                    <Field label="Sales rep phone" value={app.salesRepPhone} />
                    <Field label="Dispatch contact" value={app.dispatchContactName} />
                    <Field label="Dispatch phone" value={app.dispatchPhone} />
                    <Field label="Dispatch email" value={app.dispatchEmail} />
                    <Field
                      label="Emergency contact"
                      value={app.emergencyDispatchName}
                    />
                    <Field
                      label="Emergency phone"
                      value={app.emergencyDispatchPhone}
                    />
                  </dl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="billing">
                <AccordionTrigger>Billing</AccordionTrigger>
                <AccordionContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="Billing address" value={app.billingAddress} />
                    <Field label="Billing contact" value={app.billingContactName} />
                    <Field label="Billing email" value={app.billingEmail} />
                    <Field label="Billing phone" value={app.billingPhone} />
                    <Field label="Billing system" value={app.billingSystem} />
                    <Field
                      label="Delivery contact info"
                      value={app.deliveryContactInfo}
                    />
                  </dl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="operations">
                <AccordionTrigger>Operations</AccordionTrigger>
                <AccordionContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tankwagons" value={app.tankwagonsCount} />
                    <Field label="Transports" value={app.transportsCount} />
                    <Field
                      label="Annual gallons distributed"
                      value={app.annualGallonsDistributed?.toLocaleString()}
                    />
                    <Field
                      label="Standard order lead time"
                      value={app.standardOrderLeadTime}
                    />
                    <Field label="Pricing basis" value={app.pricingBasis} />
                    <Field
                      label="Emergency retainer"
                      value={app.emergencyRetainerWilling}
                    />
                    <Field
                      label="Emergency order lead time"
                      value={app.emergencyOrderLeadTime}
                    />
                    <div className="sm:col-span-2">
                      <Field
                        label="Operating hours"
                        value={<Tags items={app.operatingHours} />}
                      />
                    </div>
                    {app.emergencyResponseTimes ? (
                      <div className="sm:col-span-2">
                        <Field
                          label="Emergency response times"
                          value={app.emergencyResponseTimes}
                        />
                      </div>
                    ) : null}
                  </dl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="products">
                <AccordionTrigger>Products</AccordionTrigger>
                <AccordionContent>
                  <dl className="grid gap-4">
                    <Field
                      label="Products offered"
                      value={<Tags items={app.productsOffered} />}
                    />
                    <Field label="Brands offered" value={app.brandsOffered} />
                  </dl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="capabilities">
                <AccordionTrigger>Capabilities</AccordionTrigger>
                <AccordionContent>
                  <dl className="grid gap-4">
                    <Field
                      label="Delivery capabilities"
                      value={<Tags items={app.deliveryCapabilities} />}
                    />
                    <Field
                      label="Additional services"
                      value={<Tags items={app.additionalServices} />}
                    />
                    <Field label="Telematics system" value={app.telematicsSystem} />
                    <Field label="Dispatch software" value={app.dispatchSoftware} />
                  </dl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="states">
                <AccordionTrigger>Licensed States</AccordionTrigger>
                <AccordionContent>
                  <Tags items={app.licensedStates} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Right: review actions */}
        <div className="lg:col-span-1">
          <ReviewActions application={app} preview={preview} />
        </div>
      </div>
    </div>
  )
}
