import Link from "next/link"
import { Plus } from "lucide-react"

import { requireBuyer } from "@/lib/auth"
import { listBuyerRfps } from "@/lib/data/rfps"
import { BuyerRfpsTable } from "@/components/buyer/buyer-rfps-table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function BuyerRfpsPage() {
  const { profile } = await requireBuyer()
  const rfps = await listBuyerRfps(profile.id)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">My RFPs</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage fuel procurement requests.
          </p>
        </div>
        <Link href="/buyer/rfps/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Create RFP
        </Link>
      </div>
      <div className="mt-6">
        <BuyerRfpsTable data={rfps} />
      </div>
    </div>
  )
}
