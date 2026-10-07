/**
 * RFP dates. Buyers pick calendar days; the database stores instants. To keep
 * "Oct 20" meaning Oct 20 for everyone — and to keep bidding open through the
 * whole of the due day — every RFP date goes through this module.
 *
 *   bid due date        → last second of that day, US Central
 *   decision/award date → noon UTC (a pure calendar day in every US timezone)
 *   display             → always formatted in US Central
 *
 * Rows written before this existed sit at exactly midnight UTC; those are
 * treated as date-only values and shown in UTC so they don't shift a day.
 */

export const BUSINESS_TZ = "America/Chicago"

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** "2026-10-20" → the instant bidding closes: 23:59:59 that day, US Central. */
export function endOfBusinessDay(value: string): string {
  if (!DATE_ONLY.test(value)) return new Date(value).toISOString()
  // Central is UTC-5 in summer and UTC-6 in winter. Try daylight time; if that
  // instant reads 22:xx on a Central clock the date is in standard time.
  const daylight = new Date(`${value}T23:59:59-05:00`)
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, hour: "2-digit", hourCycle: "h23" }).format(daylight))
  return (hour === 23 ? daylight : new Date(`${value}T23:59:59-06:00`)).toISOString()
}

/** "2026-10-25" → noon UTC on that day. */
export function calendarDay(value: string): string {
  return new Date(DATE_ONLY.test(value) ? `${value}T12:00:00.000Z` : value).toISOString()
}

function zoneFor(d: Date): string {
  const legacyMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0
  return legacyMidnight ? "UTC" : BUSINESS_TZ
}

export function formatRfpDate(iso: string | null | undefined, style: "short" | "long" = "short"): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", {
    timeZone: zoneFor(d),
    ...(style === "long" ? { weekday: "short", month: "long" } : { month: "short" }),
    day: "numeric",
    year: "numeric",
  })
}

/** Stored instant → value for <input type="date"> ("" when unset). */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  // en-CA formats as YYYY-MM-DD.
  return d.toLocaleDateString("en-CA", { timeZone: zoneFor(d), year: "numeric", month: "2-digit", day: "2-digit" })
}

/** Today's calendar date in the business timezone, as YYYY-MM-DD. */
export function todayInBusinessTz(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" })
}
