import { z } from "zod"

export const MAX_MIN_GALLONS = 100_000_000

export const NotificationsSchema = z.object({
  emailFrequency: z.enum(["daily", "weekly", "never"], { error: "Choose how often to email you." }),
  fuelTypes: z.array(z.string().max(100), { error: "Choose fuel types from the list." }).max(60, "Too many fuel types selected."),
  states: z.array(z.string().max(60), { error: "Choose states from the list." }).max(60, "Too many states selected."),
  minGallons: z
    .number({ error: "Minimum gallons must be a whole number, e.g. 50,000." })
    .int("Minimum gallons must be a whole number, e.g. 50,000.")
    .nonnegative("Minimum gallons can't be negative.")
    .max(MAX_MIN_GALLONS, `Minimum gallons can't be more than ${MAX_MIN_GALLONS.toLocaleString("en-US")}.`),
  emergencyImmediate: z.boolean({ error: "Choose whether to get emergency alerts." }),
})

export type NotificationsValues = z.infer<typeof NotificationsSchema>

/** Parses the free-text gallons box. Blank means no minimum. */
export function parseMinGallons(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const text = raw.trim().replace(/,/g, "")
  if (text === "") return { ok: true, value: 0 }
  if (!/^\d+$/.test(text)) return { ok: false, message: "Enter a whole number of gallons, e.g. 50,000 — or leave blank for no minimum." }
  const value = Number(text)
  if (value > MAX_MIN_GALLONS) return { ok: false, message: `That's more than any RFP — enter ${MAX_MIN_GALLONS.toLocaleString("en-US")} or less.` }
  return { ok: true, value }
}
