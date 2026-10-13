/**
 * Helpers shared by the admin Updates feature and scripts/send-newsletter.ts.
 * No server-only imports: this file is also used from the CLI.
 */

export const UPDATE_PLACEHOLDERS = ["{{first_name}}", "{{name}}", "{{unsubscribe_url}}"] as const

/** A readable plain-text alternative for clients that don't render HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<div style="display:none[^>]*>[\s\S]*?<\/div>/i, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => {
      const t = String(text).replace(/<[^>]+>/g, "").trim()
      return t ? `${t} (${href})` : href
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&middot;/g, "·")
    .replace(/&rarr;/g, "→")
    .replace(/&bull;/g, "•")
    .replace(/&#10003;/g, "✓")
    .replace(/&#9679;/g, "●")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
}

/** `[Supplier name]`-style brackets left over from a draft. */
export function findPlaceholderBrackets(html: string): string[] {
  const text = htmlToText(html)
  return [...new Set(text.match(/\[[^\]\n]{1,80}\]/g) ?? [])]
}

/** Fill the per-recipient merge fields. Unknown `{{tags}}` are left alone. */
export function personalize(
  html: string,
  recipient: { fullName: string | null; unsubscribeUrl: string }
): string {
  const name = (recipient.fullName ?? "").trim()
  const first = name.split(/\s+/)[0] ?? ""
  return html
    .replace(/\{\{\s*first_name\s*\}\}/g, escapeHtml(first || "there"))
    .replace(/\{\{\s*name\s*\}\}/g, escapeHtml(name || "there"))
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, recipient.unsubscribeUrl)
}

/**
 * Accepts either a full HTML email or plain text. Plain text (no tags) is
 * wrapped in a minimal, email-safe layout so a two-line note still looks
 * intentional and still carries the unsubscribe link.
 */
export function ensureHtml(body: string): string {
  const trimmed = body.trim()
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 16px 0;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("")
  return `<!DOCTYPE html><html><body style="margin:0; padding:24px; background:#F3F6FA;"><div style="max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:12px; padding:32px; font-family:Helvetica,Arial,sans-serif; font-size:16px; line-height:25px; color:#1E293B;">${paragraphs}<p style="margin:24px 0 0 0; font-size:12px; line-height:18px; color:#94A3B8;">GridLink &middot; <a href="{{unsubscribe_url}}" style="color:#94A3B8;">Unsubscribe</a></p></div></body></html>`
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Pulls `<title>` out of pasted HTML as a default subject line. */
export function titleFromHtml(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!m) return null
  const t = htmlToText(m[1]).replace(/\s+/g, " ").trim()
  return t || null
}

export const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/

export const CONTACT_TYPES = ["investor", "mentor", "buyer", "supplier", "prospect", "partner", "other"] as const
export type ContactType = (typeof CONTACT_TYPES)[number]

export const CONTACT_STATUSES = ["active", "paused", "unsubscribed", "bounced"] as const
export type ContactStatus = (typeof CONTACT_STATUSES)[number]

export type ParsedContact = {
  email: string
  fullName: string | null
  company: string | null
  contactType: ContactType
}

/**
 * Parses pasted contact lines. Accepted per line:
 *   jane@acme.com
 *   Jane Doe <jane@acme.com>
 *   Jane Doe, jane@acme.com, Acme Fuel, supplier
 *   jane@acme.com, Jane Doe, Acme Fuel
 * Fields may be separated by commas, tabs or semicolons. Returns the good
 * rows plus the lines it couldn't read.
 */
export function parseContactLines(input: string, defaultType: ContactType = "other"): {
  contacts: ParsedContact[]
  rejected: string[]
} {
  const contacts: ParsedContact[] = []
  const rejected: string[] = []
  const seen = new Set<string>()

  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue

    // "Name <email>"
    const angle = line.match(/^(.*?)\s*<([^>]+)>\s*(?:[,;\t]\s*(.*))?$/)
    let email: string | undefined
    let fullName: string | null = null
    let rest: string[] = []
    if (angle) {
      fullName = angle[1].replace(/^"|"$/g, "").trim() || null
      email = angle[2].trim()
      rest = (angle[3] ?? "").split(/[,;\t]/).map((s) => s.trim()).filter(Boolean)
    } else {
      const fields = line.split(/[,;\t]/).map((s) => s.trim()).filter(Boolean)
      const idx = fields.findIndex((f) => EMAIL_RE.test(f))
      if (idx === -1) {
        rejected.push(line)
        continue
      }
      email = fields[idx]
      const others = fields.filter((_, i) => i !== idx)
      fullName = others[0] ?? null
      rest = others.slice(1)
    }

    if (!email || !EMAIL_RE.test(email)) {
      rejected.push(line)
      continue
    }
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    let contactType: ContactType = defaultType
    let company: string | null = null
    for (const f of rest) {
      const lower = f.toLowerCase()
      if ((CONTACT_TYPES as readonly string[]).includes(lower)) contactType = lower as ContactType
      else if (!company) company = f
    }

    contacts.push({ email: key, fullName, company, contactType })
  }

  return { contacts, rejected }
}
