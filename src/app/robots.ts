import type { MetadataRoute } from "next"

import { siteUrl } from "@/emails/components/email-layout"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Portals, token-gated links and auth plumbing have nothing to index.
      disallow: [
        "/admin",
        "/buyer",
        "/vendor",
        "/vendor-registration",
        "/invoices",
        "/messages",
        "/attachments",
        "/api",
        "/ai",
        "/auth",
        "/logout",
        "/reset-password",
        "/forgot-password",
        "/signup/submitted",
        // Link-only documents (executive summary etc.): reachable, not indexed.
        "/docs",
        "/updates",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
