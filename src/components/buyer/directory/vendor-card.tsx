import Link from "next/link"
import { Award, Building2, ShieldCheck } from "lucide-react"

import type { DirectoryVendor } from "@/lib/directory/shared"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

function formatGallons(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M gal/yr`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K gal/yr`
  return `${n.toLocaleString()} gal/yr`
}

export function VendorCard({ vendor }: { vendor: DirectoryVendor }) {
  const states = vendor.states.slice(0, 3)
  const products = vendor.products.slice(0, 3)

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
            <Building2 className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-navy">{vendor.companyName}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-xs font-medium text-emerald">
                <ShieldCheck className="size-3" />
                GridLink Verified
              </span>
              {vendor.specialCertification ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-medium text-brand-blue">
                  <Award className="size-3" />
                  {vendor.specialCertification}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {states.map((s) => (
            <Badge key={s} variant="secondary" className="bg-muted font-normal text-xs">
              {s}
            </Badge>
          ))}
          {vendor.states.length > 3 ? (
            <Badge variant="secondary" className="bg-muted font-normal text-xs">
              +{vendor.states.length - 3} more
            </Badge>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {products.map((p) => (
            <Badge
              key={p}
              variant="outline"
              className="border-brand-blue/30 font-normal text-xs text-brand-blue"
            >
              {p}
            </Badge>
          ))}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {formatGallons(vendor.annualGallons)}
        </p>

        <div className="mt-auto pt-4">
          <Link
            href={`/buyer/directory/${vendor.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            View Profile
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
