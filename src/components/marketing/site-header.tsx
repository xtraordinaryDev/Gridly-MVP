import Link from "next/link"
import { Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const NAV_LINKS = [
  { label: "Platform", href: "/#platform" },
  { label: "Solutions", href: "/#solutions" },
  { label: "Verified Directory", href: "/login" },
  { label: "About", href: "/#about" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-navy-foreground">
            <Zap className="size-4 fill-brand-blue text-brand-blue" />
          </span>
          <span className="text-lg font-bold tracking-tight text-navy">
            Grid<span className="text-brand-blue">Link</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-navy"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "hidden sm:inline-flex"
            )}
          >
            For Buyers
          </Link>
          <Link
            href="/become-a-supplier"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Become a Supplier
          </Link>
        </div>
      </div>
    </header>
  )
}
