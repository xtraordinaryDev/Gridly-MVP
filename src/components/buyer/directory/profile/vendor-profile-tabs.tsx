"use client"

import Link from "next/link"
import { ExternalLink, Globe } from "lucide-react"

import type { VendorPublicProfile } from "@/lib/directory/profile"
import {
  complianceStatusLabel,
  formatProfileDate,
} from "@/lib/directory/profile"
import { PRODUCT_CATEGORIES } from "@/lib/schemas/vendor-application"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoverageUsMap } from "./coverage-us-map"
import { CheckmarkList } from "./checkmark-list"
import { cn } from "@/lib/utils"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function formatGallons(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

const COMPLIANCE_BADGE: Record<
  VendorPublicProfile["compliance"][0]["status"],
  string
> = {
  valid: "bg-emerald/15 text-emerald border-emerald/30",
  expires_soon: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  expired: "bg-destructive/15 text-destructive border-destructive/30",
}

export function VendorProfileTabs({ profile }: { profile: VendorPublicProfile }) {
  const productsByCategory = Object.entries(PRODUCT_CATEGORIES).map(([cat, items]) => ({
    category: cat,
    items: profile.products.filter((p) => (items as readonly string[]).includes(p)),
  }))

  return (
    <Tabs defaultValue="overview" className="mt-6">
      <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-0 border-b border-border bg-transparent p-0">
        {[
          ["overview", "Overview"],
          ["products", "Products & Brands"],
          ["coverage", "Coverage"],
          ["capabilities", "Capabilities"],
          ["operations", "Operations"],
          ["emergency", "Emergency Services"],
          ["compliance", "Compliance"],
          ["contacts", "Contacts"],
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-active:border-brand-blue data-active:bg-transparent"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-6 space-y-8">
        <Section title="About">
          <p className="text-sm leading-relaxed text-foreground">
            {profile.description ??
              "Verified fuel supplier on the GridLink network with compliance documentation on file."}
          </p>
        </Section>
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Coverage</dt>
            <dd className="mt-1 font-medium">
              {profile.nationwide ? "Nationwide" : "Regional / multi-state"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Year founded</dt>
            <dd className="mt-1 font-medium">{profile.yearFounded ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Organization type</dt>
            <dd className="mt-1 font-medium">{profile.organizationTypes.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Entity</dt>
            <dd className="mt-1 font-medium">
              {profile.stateOfIncorporation} · {profile.entityType}
            </dd>
          </div>
        </dl>
        {profile.certifications.length > 0 ? (
          <Section title="Certifications">
            <div className="flex flex-wrap gap-2">
              {profile.certifications.map((c) => (
                <Badge
                  key={c}
                  className="border-emerald/30 bg-emerald/10 font-medium text-emerald"
                >
                  {c}
                </Badge>
              ))}
            </div>
          </Section>
        ) : null}
        {profile.websiteUrl ? (
          <Section title="Website">
            <Link
              href={profile.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline"
            >
              <Globe className="size-4" />
              {profile.websiteUrl.replace(/^https?:\/\//, "")}
              <ExternalLink className="size-3.5" />
            </Link>
          </Section>
        ) : null}
      </TabsContent>

      <TabsContent value="products" className="mt-6 space-y-8">
        {productsByCategory.map(
          ({ category, items }) =>
            items.length > 0 && (
              <Section key={category} title={category}>
                <div className="flex flex-wrap gap-2">
                  {items.map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="border-brand-blue/40 bg-brand-blue/5 px-3 py-1 text-sm font-normal text-brand-blue"
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </Section>
            )
        )}
        {profile.products.filter(
          (p) => !productsByCategory.some((g) => g.items.includes(p))
        ).length > 0 ? (
          <Section title="Other">
            <div className="flex flex-wrap gap-2">
              {profile.products
                .filter((p) => !productsByCategory.some((g) => g.items.includes(p)))
                .map((p) => (
                  <Badge key={p} variant="secondary">
                    {p}
                  </Badge>
                ))}
            </div>
          </Section>
        ) : null}
        <Section title="Brands">
          <p className="text-sm text-foreground">
            {profile.brandsOffered.length
              ? profile.brandsOffered.join(" · ")
              : "No brand affiliations listed"}
          </p>
        </Section>
      </TabsContent>

      <TabsContent value="coverage" className="mt-6 space-y-8">
        <CoverageUsMap licensedStates={profile.states} />
        <div className="grid gap-6 sm:grid-cols-2">
          <Section title="Areas — owned trucks">
            <p className="text-sm">{profile.areasOwnedTrucks}</p>
          </Section>
          <Section title="Areas — subcontracted">
            <p className="text-sm">{profile.areasSubcontracted}</p>
          </Section>
        </div>
        <Section title="Terminals">
          <ul className="list-inside list-disc space-y-1 text-sm">
            {profile.terminals.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
      </TabsContent>

      <TabsContent value="capabilities" className="mt-6">
        <div className="grid gap-8 md:grid-cols-2">
          <Section title="Delivery capabilities">
            <CheckmarkList items={profile.deliveryCapabilities} />
          </Section>
          <Section title="Technology capabilities">
            <CheckmarkList items={profile.techCapabilities} />
          </Section>
        </div>
      </TabsContent>

      <TabsContent value="operations" className="mt-6">
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Annual gallons</dt>
            <dd className="mt-1 text-lg font-semibold text-navy">
              {formatGallons(profile.annualGallons)} gal/yr
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tankwagons</dt>
            <dd className="mt-1 font-medium">{profile.tankwagons}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Transports</dt>
            <dd className="mt-1 font-medium">{profile.transports}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Standard lead time</dt>
            <dd className="mt-1 font-medium">{profile.standardLeadTime}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Pricing basis</dt>
            <dd className="mt-1 font-medium">{profile.pricingBasis}</dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-xs text-muted-foreground">Operating hours</dt>
            <dd className="mt-2">
              <CheckmarkList items={profile.operatingHours} />
            </dd>
          </div>
        </dl>
      </TabsContent>

      <TabsContent value="emergency" className="mt-6 space-y-6">
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Emergency retainer</dt>
            <dd className="mt-1 font-medium">{profile.emergencyRetainer}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Response times</dt>
            <dd className="mt-1 font-medium">{profile.emergencyResponseTimes}</dd>
          </div>
        </dl>
        <Section title="Pricing tiers">
          <p className="text-sm text-muted-foreground">{profile.emergencyPricingTiers}</p>
        </Section>
      </TabsContent>

      <TabsContent value="compliance" className="mt-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Document attestation only — files are not shared with buyers. GridLink has
          reviewed submissions on file.
        </p>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {profile.compliance.map((doc) => (
            <li
              key={doc.type}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"
            >
              <div>
                <p className="font-medium text-navy">{doc.label}</p>
                {doc.expiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    Expires {formatProfileDate(doc.expiresAt)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No expiration on file</p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn("font-medium", COMPLIANCE_BADGE[doc.status])}
              >
                {complianceStatusLabel(doc.status)}
              </Badge>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="contacts" className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {profile.contacts.map((c) => (
            <div
              key={c.role}
              className="rounded-xl border border-border bg-muted/20 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                {c.role}
              </p>
              <p className="mt-2 font-medium text-navy">{c.name}</p>
              <a
                href={`mailto:${c.email}`}
                className="mt-1 block text-sm text-brand-blue hover:underline"
              >
                {c.email}
              </a>
              <a
                href={`tel:${c.phone.replace(/\D/g, "")}`}
                className="mt-0.5 block text-sm text-muted-foreground hover:text-foreground"
              >
                {c.phone}
              </a>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}
