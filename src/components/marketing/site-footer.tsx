import Link from "next/link"
import { Zap } from "lucide-react"

const FOOTER_COLUMNS = [
  {
    heading: "Platform",
    links: [
      { label: "Fuel Procurement", href: "/#platform" },
      { label: "Vendor Vault", href: "/#platform" },
      { label: "Compliance", href: "/#platform" },
      { label: "Verified Directory", href: "/login" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/#about" },
      { label: "Solutions", href: "/#solutions" },
      { label: "Become a Supplier", href: "/become-a-supplier" },
      { label: "Contact", href: "/#about" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Buyer Login", href: "/login" },
      { label: "Buyer Sign Up", href: "/signup" },
      { label: "Vendor Login", href: "/login" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy text-navy-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-xs">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
              <Zap className="size-4 fill-brand-blue text-brand-blue" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Grid<span className="text-brand-blue">Link</span>
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            The procurement operating system for fuel. A single, audit-ready
            system of record for enterprise fuel buyers and verified suppliers.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading}>
            <h4 className="text-sm font-semibold text-white">
              {column.heading}
            </h4>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-white/50 sm:flex-row sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} GridLink. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/#" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/#" className="transition-colors hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
