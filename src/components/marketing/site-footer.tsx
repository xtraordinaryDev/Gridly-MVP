import Link from "next/link"
import { GridLinkLogo } from "@/components/brand/logo"
import { NewsletterSignup } from "@/components/marketing/newsletter-signup"

const FOOTER_COLUMNS = [
  {
    heading: "Platform",
    links: [
      { label: "GridLink AI", href: "/#ai" },
      { label: "Verified Supplier Network", href: "/#verified-network" },
      { label: "Compliance", href: "/#compliance" },
      { label: "Verified Directory", href: "/login" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Platform", href: "/#solutions" },
      { label: "Become a Supplier", href: "/become-a-supplier" },
      { label: "hello@gridlink.global", href: "mailto:hello@gridlink.global" },
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
            <GridLinkLogo tone="dark" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            AI-powered fuel procurement. Describe the need, GridLink AI drafts
            the RFP, ranks verified suppliers and briefs you on every bid. You
            make the award.
          </p>
          <NewsletterSignup className="mt-6" />
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
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-2 px-4 py-6 text-xs text-white/50 sm:flex-row sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} GridLink. All rights reserved.</p>
          <a href="mailto:hello@gridlink.global" className="transition-colors hover:text-white sm:ml-auto">
            hello@gridlink.global
          </a>
        </div>
      </div>
    </footer>
  )
}
