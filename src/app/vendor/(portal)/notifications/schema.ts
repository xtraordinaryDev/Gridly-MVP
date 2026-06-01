import { z } from "zod"

export const NotificationsSchema = z.object({
  emailFrequency: z.enum(["daily", "weekly", "never"]),
  fuelTypes: z.array(z.string()),
  states: z.array(z.string()),
  minGallons: z.number().int().nonnegative(),
  emergencyImmediate: z.boolean(),
})

export type NotificationsValues = z.infer<typeof NotificationsSchema>
