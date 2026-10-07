import type { MetadataRoute } from "next"

import { siteUrl } from "@/emails/components/email-layout"

// Public marketing routes only — everything else is behind a login or a token.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/become-a-supplier`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
  ]
}
