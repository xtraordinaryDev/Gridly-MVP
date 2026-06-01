import Link from "next/link"
import { Building2, Globe, Mail, BookmarkPlus, FileInput } from "lucide-react"

import type { VendorPublicProfile } from "@/lib/directory/profile"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { GridLinkVerifiedBadge } from "./gridlink-verified-badge"

export function VendorProfileHero({ profile }: { profile: VendorPublicProfile }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-navy/5 text-navy sm:size-24">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logoUrl}
                alt=""
                className="size-full rounded-2xl object-cover"
              />
            ) : (
              <Building2 className="size-10 sm:size-12" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
              {profile.companyName}
            </h1>
            <p className="mt-1 text-muted-foreground">{profile.tagline}</p>
            {profile.nationwide ? (
              <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand-blue/10 px-2 py-0.5 text-xs font-medium text-brand-blue">
                <Globe className="size-3.5" />
                Nationwide coverage
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/buyer/rfps/new" className={cn(buttonVariants())}>
                <FileInput className="size-4" />
                Invite to RFP
              </Link>
              <Link
                href="/buyer/saved"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <BookmarkPlus className="size-4" />
                Save to List
              </Link>
              <a
                href={`mailto:${profile.contacts[0]?.email ?? "sales@example.com"}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Mail className="size-4" />
                Contact
              </a>
            </div>
          </div>
        </div>

        <GridLinkVerifiedBadge
          verifiedAt={profile.verifiedAt}
          lastReviewedAt={profile.lastReviewedAt}
          className="shrink-0 self-start lg:self-center"
        />
      </div>
    </div>
  )
}
