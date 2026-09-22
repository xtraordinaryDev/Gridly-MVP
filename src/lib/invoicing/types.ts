export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "disputed"
  | "partially_paid"
  | "paid"
  | "void"

export type PaymentMethod = "ach" | "check" | "wire" | "card" | "other"
export type LineKind = "fuel" | "fee" | "tax" | "credit"
export type InvoiceEventType =
  | "created"
  | "sent"
  | "viewed"
  | "disputed"
  | "dispute_resolved"
  | "payment_recorded"
  | "paid"
  | "voided"
  | "reminder_sent"
  | "note"

export type PartyRole = "buyer" | "vendor" | "admin"

export interface Viewer {
  role: PartyRole
  /** profile id for buyer/admin, vendor id for vendor */
  id: string
}

export interface ContractSummary {
  id: string
  rfpId: string
  title: string
  fuelType: string
  quantityGallons: number
  pricePerGallon: number
  deliveryTerms: string | null
  netDays: number
  pricingMode: "fixed" | "index"
  indexName: string | null
  differential: number | null
  status: "active" | "completed" | "cancelled"
  awardedAt: string
  buyerId: string
  buyerName: string
  vendorId: string
  vendorName: string
  invoiceCount: number
  invoicedTotal: number
  paidTotal: number
}

export interface InvoiceLineItem {
  id?: string
  kind: LineKind
  description: string
  deliveryDate: string | null
  ticketNumber: string | null
  gallons: number | null
  pricePerGallon: number | null
  indexPrice?: number | null
  deliveryId?: string | null
  amount: number
}

export interface InvoiceListItem {
  id: string
  number: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  total: number
  amountPaid: number
  balance: number
  isOverdue: boolean
  daysOverdue: number
  buyerName: string
  vendorName: string
  contractId: string
  contractTitle: string
  sentAt: string | null
}

export interface PaymentView {
  id: string
  amount: number
  method: PaymentMethod
  reference: string | null
  paidAt: string
  recordedRole: PartyRole | null
  note: string | null
}

export interface InvoiceEventView {
  id: string
  type: InvoiceEventType
  actorRole: string | null
  message: string | null
  amount: number | null
  createdAt: string
}

export interface InvoiceDetail extends InvoiceListItem {
  subtotal: number
  feesTotal: number
  taxTotal: number
  notes: string | null
  lineItems: InvoiceLineItem[]
  payments: PaymentView[]
  events: InvoiceEventView[]
  viewToken: string
  viewedAt: string | null
  disputedAt: string | null
  disputeReason: string | null
  paidAt: string | null
  pdfPath: string | null
  contract: {
    fuelType: string
    pricePerGallon: number
    quantityGallons: number
    deliveryTerms: string | null
    netDays: number
  }
  vendorAddress: string | null
  buyerId: string
  vendorId: string
}

export interface InvoiceInput {
  contractId: string
  issueDate: string
  dueDate: string
  notes?: string
  lineItems: InvoiceLineItem[]
}

export interface PaymentInput {
  amount: number
  method: PaymentMethod
  reference?: string
  paidAt: string
  note?: string
}

export interface AgingBucket {
  key: "current" | "1_30" | "31_60" | "61_90" | "90_plus"
  label: string
  amount: number
  count: number
}

export interface MonthPoint {
  month: string // YYYY-MM
  label: string // "Jun"
  invoiced: number
  paid: number
}

export interface NamedAmount {
  name: string
  amount: number
}

export interface VendorInvoiceStats {
  outstanding: number
  overdue: number
  overdueCount: number
  paidThisMonth: number
  paidYtd: number
  avgDaysToPay: number | null
  openCount: number
  aging: AgingBucket[]
  byBuyer: NamedAmount[]
  monthly: MonthPoint[]
}

export interface BuyerInvoiceStats {
  outstanding: number
  dueThisWeek: number
  dueThisWeekCount: number
  overdue: number
  overdueCount: number
  spendYtd: number
  disputedCount: number
  bySupplier: NamedAmount[]
  byFuel: NamedAmount[]
  priceVsAwarded: { contract: string; awarded: number; actual: number }[]
  monthly: MonthPoint[]
}

export interface AdminInvoiceStats {
  invoicedTotal: number
  paidTotal: number
  outstanding: number
  overdue: number
  invoiceCount: number
  topVendors: NamedAmount[]
  topBuyers: NamedAmount[]
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  disputed: "Disputed",
  partially_paid: "Partially paid",
  paid: "Paid",
  void: "Void",
}

export const OPEN_STATUSES: InvoiceStatus[] = ["sent", "viewed", "disputed", "partially_paid"]

export function isOpenStatus(s: InvoiceStatus) {
  return OPEN_STATUSES.includes(s)
}

export function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

/** Compact currency for stat tiles: $1.42M, $569.4k, $8,240. */
export function moneyCompact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 100_000) return `$${(n / 1_000).toFixed(1)}k`
  return money(n)
}
