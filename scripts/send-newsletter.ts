/**
 * GridLink — send an HTML newsletter through Resend.
 *
 * Usage:
 *   # 1. Test send to yourself (always do this first)
 *   npx tsx scripts/send-newsletter.ts --html docs/newsletters/2026-10-update-01.html \
 *     --subject "GridLink Update #1: Our first supplier is in the system" --to you@example.com --send
 *
 *   # 2. Real send: one email per address in a text file (one address per line, # for comments)
 *   npx tsx scripts/send-newsletter.ts --html docs/newsletters/2026-10-update-01.html \
 *     --subject "..." --list docs/newsletters/investors.txt --send
 *
 * Without --send it only prints what it would do. Reads RESEND_API_KEY and
 * RESEND_FROM_EMAIL from .env.local. Refuses to send while the HTML still has
 * [bracketed placeholders] unless --allow-placeholders is passed.
 *
 * Each recipient gets their own message (no visible To list, no BCC), with a
 * plain-text alternative generated from the HTML for clients that need it.
 */

import { existsSync, readFileSync } from "fs"
import { resolve } from "path"

import { findPlaceholderBrackets, htmlToText, personalize } from "../src/lib/updates/html"

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!(key in process.env)) process.env[key] = val
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}
const flag = (name: string) => process.argv.includes(`--${name}`)

async function main() {
  loadEnv()

  const htmlPath = arg("html")
  const subject = arg("subject")
  if (!htmlPath || !subject) {
    console.error("Required: --html <file> --subject <text> and one of --to <a,b> | --list <file>")
    process.exit(1)
  }

  const recipients = new Set<string>()
  for (const r of (arg("to") ?? "").split(",")) if (r.trim()) recipients.add(r.trim().toLowerCase())
  const listPath = arg("list")
  if (listPath) {
    for (const line of readFileSync(resolve(listPath), "utf8").split("\n")) {
      const t = line.trim()
      if (t && !t.startsWith("#")) recipients.add(t.toLowerCase())
    }
  }
  if (recipients.size === 0) {
    console.error("No recipients. Pass --to a@b.com or --list file.txt")
    process.exit(1)
  }
  const bad = [...recipients].filter((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r))
  if (bad.length) {
    console.error("Invalid addresses:", bad.join(", "))
    process.exit(1)
  }

  const raw = readFileSync(resolve(htmlPath), "utf8")
  const placeholders = findPlaceholderBrackets(raw)
  if (placeholders.length && !flag("allow-placeholders")) {
    console.error("The HTML still contains placeholders. Fill these in (or pass --allow-placeholders for a test send):")
    for (const p of placeholders) console.error("  " + p)
    process.exit(1)
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || "GridLink <onboarding@resend.dev>"
  const apiKey = process.env.RESEND_API_KEY?.trim()
  // No per-contact tokens from the CLI: merge fields fall back to a reply-to-unsubscribe link.
  const replyAddress = from.match(/<([^>]+)>/)?.[1] ?? from
  const html = personalize(raw, { fullName: null, unsubscribeUrl: `mailto:${replyAddress}?subject=Unsubscribe` })
  const text = htmlToText(html)

  console.log(`From:       ${from}`)
  console.log(`Subject:    ${subject}`)
  console.log(`Recipients: ${recipients.size}`)
  for (const r of recipients) console.log(`  ${r}`)
  if (from.includes("resend.dev")) {
    console.warn("\nWARNING: RESEND_FROM_EMAIL is the Resend sandbox sender. It only delivers to the email on your Resend account.")
    console.warn("         Verify gridlink.global in Resend and set RESEND_FROM_EMAIL=\"GridLink <updates@gridlink.global>\" before a real send.")
  }

  if (!flag("send")) {
    console.log("\nDry run. Add --send to actually send.")
    return
  }
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set.")
    process.exit(1)
  }

  const { Resend } = await import("resend")
  const resend = new Resend(apiKey)
  let sent = 0
  const failed: string[] = []
  for (const to of recipients) {
    const { data, error } = await resend.emails.send({ from, to, subject, html, text })
    if (error) {
      failed.push(`${to}: ${error.message}`)
      console.error(`  FAIL ${to}: ${error.message}`)
    } else {
      sent++
      console.log(`  sent ${to} (${data?.id})`)
    }
    // Resend's default rate limit is 2 requests per second.
    await new Promise((r) => setTimeout(r, 600))
  }
  console.log(`\nDone. Sent ${sent}, failed ${failed.length}.`)
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
