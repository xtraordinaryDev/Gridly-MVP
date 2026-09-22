import "server-only"

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer"

import type { InvoiceDetail } from "@/lib/invoicing/types"
import { INVOICE_STATUS_LABEL, money } from "@/lib/invoicing/types"

const navy = "#0A2540"
const blue = "#3B82F6"
const muted = "#6B7280"
const border = "#E5E7EB"

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  brand: { fontSize: 18, fontWeight: 700, color: navy },
  brandAccent: { color: blue },
  h1: { fontSize: 22, fontWeight: 700, color: navy, textAlign: "right" },
  number: { fontSize: 11, color: muted, textAlign: "right", marginTop: 2 },
  status: {
    marginTop: 6,
    alignSelf: "flex-end",
    fontSize: 9,
    color: navy,
    backgroundColor: "#EFF6FF",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  cols: { flexDirection: "row", gap: 24, marginBottom: 20 },
  col: { flex: 1 },
  label: { fontSize: 8, color: muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  value: { fontSize: 10, color: "#111827", marginBottom: 1 },
  strong: { fontWeight: 700, color: navy },
  table: { borderWidth: 1, borderColor: border, borderRadius: 4, marginBottom: 16 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 7, paddingHorizontal: 8 },
  rowLast: { borderBottomWidth: 0 },
  th: { fontSize: 8, color: muted, textTransform: "uppercase", letterSpacing: 0.5 },
  cDesc: { flex: 4 },
  cDate: { flex: 1.6 },
  cTicket: { flex: 1.4 },
  cQty: { flex: 1.2, textAlign: "right" },
  cPpg: { flex: 1.2, textAlign: "right" },
  cAmt: { flex: 1.5, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: 240 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  tGrand: { borderTopWidth: 1, borderTopColor: border, marginTop: 4, paddingTop: 6 },
  notes: { marginTop: 20, padding: 10, backgroundColor: "#F9FAFB", borderRadius: 4 },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: muted, textAlign: "center" },
})

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d + (d.length === 10 ? "T12:00:00Z" : "")).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function InvoicePdf({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <Document title={`Invoice ${invoice.number}`} author={invoice.vendorName}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>
              Grid<Text style={s.brandAccent}>Link</Text>
            </Text>
            <Text style={{ color: muted, marginTop: 2 }}>Verified fuel procurement network</Text>
          </View>
          <View>
            <Text style={s.h1}>INVOICE</Text>
            <Text style={s.number}>{invoice.number}</Text>
            <Text style={s.status}>{INVOICE_STATUS_LABEL[invoice.status]}</Text>
          </View>
        </View>

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.label}>From</Text>
            <Text style={[s.value, s.strong]}>{invoice.vendorName}</Text>
            {invoice.vendorAddress ? <Text style={s.value}>{invoice.vendorAddress}</Text> : null}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Bill to</Text>
            <Text style={[s.value, s.strong]}>{invoice.buyerName}</Text>
            <Text style={s.value}>Contract: {invoice.contractTitle}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Issue date</Text>
            <Text style={s.value}>{fmtDate(invoice.issueDate)}</Text>
            <Text style={[s.label, { marginTop: 6 }]}>Due date</Text>
            <Text style={[s.value, s.strong]}>{fmtDate(invoice.dueDate)}</Text>
            <Text style={[s.label, { marginTop: 6 }]}>Terms</Text>
            <Text style={s.value}>Net {invoice.contract.netDays}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={[s.row, { backgroundColor: "#F9FAFB" }]}>
            <Text style={[s.th, s.cDesc]}>Description</Text>
            <Text style={[s.th, s.cDate]}>Delivered</Text>
            <Text style={[s.th, s.cTicket]}>Ticket #</Text>
            <Text style={[s.th, s.cQty]}>Gallons</Text>
            <Text style={[s.th, s.cPpg]}>$/gal</Text>
            <Text style={[s.th, s.cAmt]}>Amount</Text>
          </View>
          {invoice.lineItems.map((l, i) => (
            <View key={l.id ?? i} style={[s.row, i === invoice.lineItems.length - 1 ? s.rowLast : {}]}>
              <Text style={s.cDesc}>{l.description}</Text>
              <Text style={s.cDate}>{l.deliveryDate ? fmtDate(l.deliveryDate) : ""}</Text>
              <Text style={s.cTicket}>{l.ticketNumber ?? ""}</Text>
              <Text style={s.cQty}>{l.gallons ? l.gallons.toLocaleString("en-US") : ""}</Text>
              <Text style={s.cPpg}>{l.pricePerGallon ? `$${l.pricePerGallon.toFixed(4)}` : ""}</Text>
              <Text style={s.cAmt}>{money(l.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.tRow}>
            <Text style={{ color: muted }}>Subtotal</Text>
            <Text>{money(invoice.subtotal)}</Text>
          </View>
          {invoice.feesTotal ? (
            <View style={s.tRow}>
              <Text style={{ color: muted }}>Fees</Text>
              <Text>{money(invoice.feesTotal)}</Text>
            </View>
          ) : null}
          {invoice.taxTotal ? (
            <View style={s.tRow}>
              <Text style={{ color: muted }}>Taxes</Text>
              <Text>{money(invoice.taxTotal)}</Text>
            </View>
          ) : null}
          <View style={[s.tRow, s.tGrand]}>
            <Text style={[s.strong, { fontSize: 12 }]}>Total</Text>
            <Text style={[s.strong, { fontSize: 12 }]}>{money(invoice.total)}</Text>
          </View>
          {invoice.amountPaid > 0 ? (
            <>
              <View style={s.tRow}>
                <Text style={{ color: muted }}>Paid</Text>
                <Text>-{money(invoice.amountPaid)}</Text>
              </View>
              <View style={s.tRow}>
                <Text style={s.strong}>Balance due</Text>
                <Text style={s.strong}>{money(invoice.balance)}</Text>
              </View>
            </>
          ) : null}
        </View>

        {invoice.notes ? (
          <View style={s.notes}>
            <Text style={s.label}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={s.footer}>
          Generated by GridLink · {invoice.vendorName} · Invoice {invoice.number}
        </Text>
      </Page>
    </Document>
  )
}

export async function renderInvoicePdf(invoice: InvoiceDetail): Promise<Buffer> {
  return renderToBuffer(<InvoicePdf invoice={invoice} />)
}
