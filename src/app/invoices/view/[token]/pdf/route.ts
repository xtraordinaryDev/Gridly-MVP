import { getInvoiceByToken, getInvoicePdfBytes } from "@/lib/data/invoices"

export async function GET(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const invoice = await getInvoiceByToken(token)
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
