import { NextResponse } from "next/server"

import { isUuid } from "@/lib/storage/paths"
import { unsubscribeUpdateContact } from "@/lib/data/updates"

/**
 * RFC 8058 one-click unsubscribe. Gmail, Yahoo and Outlook POST here when a
 * reader presses their "Unsubscribe" button, using the List-Unsubscribe
 * header on each update. GET redirects to the human-readable page.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  if (!isUuid(token)) return new NextResponse("Not found", { status: 404 })
  const result = await unsubscribeUpdateContact(token)
  return new NextResponse(result.ok ? "Unsubscribed" : "Not found", { status: result.ok ? 200 : 404 })
}

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  return NextResponse.redirect(new URL(`/updates/unsubscribe/${encodeURIComponent(token)}`, req.url), 302)
}
