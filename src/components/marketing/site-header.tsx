import Link from "next/link"
import { GridLinkLogo } from "@/components/brand/logo"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { SiteMobileMenu } from "@/components/marketing/site-mobile-menu"

const NAV_LINKS = [
  { label: "AI", href: "/#ai" },
  { label: "Platform", href: "/#solutions" },
  { label: "Verified Directory", href: "/login" },
  { label: "How it works", href: "/#how-it-works" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <GridLinkLogo />
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
            Log In
          </Link>
          <Link
            href="/become-a-supplier"
            className={cn(buttonVariants({ size: "lg" }), "hidden sm:inline-flex")}
          >
            Become a Supplier
          </Link>
          <SiteMobileMenu links={NAV_LINKS} />
        </div>
      </div>
    </header>
  )
}
