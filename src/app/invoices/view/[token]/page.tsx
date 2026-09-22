import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Download, LogIn, Zap } from "lucide-react"

import { getInvoiceByToken, markViewedByToken } from "@/lib/data/invoices"
import { InvoiceDetailView } from "@/components/invoicing/invoice-detail-view"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Invoice — GridLink",
  robots: { index: false, follow: false },
}

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invoice = await getInvoiceByToken(token)
  if (!invoice) notFound()
  await markViewedByToken(token)
  const fresh = (await getInvoiceByToken(token)) ?? invoice

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-navy-foreground">
              <Zap className="size-4 fill-brand-blue text-brand-blue" />
            </span>
            <span className="text-lg font-bold tracking-tight text-navy">
              Grid<span className="text-brand-blue">Link</span>
            </span>
          </Link>
          <div className="flex gap-2">
            <a href={`/invoices/view/${token}/pdf`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
              <Download className="size-4" />
              Download PDF
            </a>
            <Link href="/login" className={cn(buttonVariants(), "gap-2")}>
              <LogIn className="size-4" />
              Sign in to pay or dispute
            </Link>
          </div>
        </div>
      </header>
      <div className="px-4 py-8 sm:px-6">
        <InvoiceDetailView invoice={fresh} role="buyer" readOnly />
      </div>
    </main>
  )
}
