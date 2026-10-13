/** Shared by the admin Expenses screen and its server code. No server-only imports. */

export const EXPENSE_CATEGORIES = [
  "software",
  "ai_api",
  "legal",
  "insurance",
  "people",
  "marketing",
  "office",
  "travel",
  "fees",
  "other",
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  software: "Software & hosting",
  ai_api: "AI & API usage",
  legal: "Legal & accounting",
  insurance: "Insurance",
  people: "People & contractors",
  marketing: "Marketing",
  office: "Office & equipment",
  travel: "Travel",
  fees: "Bank & platform fees",
  other: "Other",
}

export const EXPENSE_FREQUENCIES = ["one_time", "weekly", "monthly", "quarterly", "annual"] as const
export type ExpenseFrequency = (typeof EXPENSE_FREQUENCIES)[number]

export const FREQUENCY_LABEL: Record<ExpenseFrequency, string> = {
  one_time: "One-time",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
}

/** Cents per month for a recurring charge; one-time charges contribute nothing to run-rate. */
export function monthlyCents(amountCents: number, frequency: ExpenseFrequency): number {
  switch (frequency) {
    case "weekly":
      return Math.round((amountCents * 52) / 12)
    case "monthly":
      return amountCents
    case "quarterly":
      return Math.round(amountCents / 3)
    case "annual":
      return Math.round(amountCents / 12)
    case "one_time":
      return 0
  }
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 === 0 ? 0 : 2 })
}

/** "$49" or "$49 / mo" */
export function formatCharge(amountCents: number, frequency: ExpenseFrequency): string {
  const unit = { one_time: "", weekly: " / wk", monthly: " / mo", quarterly: " / qtr", annual: " / yr" }[frequency]
  return formatMoney(amountCents) + unit
}

/** Parses "1,250.50" or "$49" into cents; null when it isn't a non-negative amount. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = String(input).replace(/[$,\s]/g, "")
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const n = Math.round(Number(cleaned) * 100)
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000_000 ? n : null
}
