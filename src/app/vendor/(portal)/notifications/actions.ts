"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { NotificationsSchema } from "./schema"

export type NotificationsResult = { ok: true } | { ok: false; message: string }

export async function saveNotificationPrefs(
  vendorId: string,
  values: unknown
): Promise<NotificationsResult> {
  const parsed = NotificationsSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  if (!isSupabaseConfigured()) return { ok: true }

  try {
    const supabase = await createClient()
    const v = parsed.data
    const { error } = await supabase.from("opportunity_notifications").upsert(
      {
        vendor_id: vendorId,
        email_frequency: v.emailFrequency,
        fuel_types: v.fuelTypes,
        states: v.states,
        min_gallons: v.minGallons,
        emergency_immediate: v.emergencyImmediate,
      },
      { onConflict: "vendor_id" }
    )

    if (error) return { ok: false, message: "Couldn't save your preferences." }

    revalidatePath("/vendor/notifications")
    return { ok: true }
  } catch (err) {
    console.error("saveNotificationPrefs error:", err)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
}
