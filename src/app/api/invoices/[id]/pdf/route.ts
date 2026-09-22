import { getSessionProfile } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { getInvoice, getInvoicePdfBytes } from "@/lib/data/invoices"
import type { Viewer } from "@/lib/invoicing/types"

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  let viewer: Viewer | null = null
  if (!isSupabaseConfigured()) {
    // Preview mode: the detail lookup below is party-scoped by mock ids.
    viewer = { role: "admin", id: "preview" }
  } else {
    const profile = await getSessionProfile()
    if (!profile) return new Response("Unauthorized", { status: 401 })
    viewer =
      profile.role === "vendor"
        ? { role: "vendor", id: await resolveVendorIdForSession(profile.id, false) }
        : { role: profile.role, id: profile.id }
  }

  const invoice = await getInvoice(id, viewer)
  if (!invoice) return new Response("Not found", { status: 404 })

  const bytes = await getInvoicePdfBytes(invoice)
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
