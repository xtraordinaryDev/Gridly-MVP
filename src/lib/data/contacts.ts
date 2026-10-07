import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

/** Login email for a profile (buyers, and vendors who have created their account). */
export async function emailForProfile(profileId: string | null | undefined): Promise<string | null> {
  if (!profileId) return null
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(profileId)
    return data.user?.email ?? null
  } catch {
    return null
  }
}

export interface VendorContact {
  companyName: string
  /** null when we have no way to reach this supplier by email */
  email: string | null
}

/**
 * Where to email each supplier: their login email if they have an account,
 * otherwise the sales contact from their approved application (a verified
 * supplier who hasn't created a login yet still needs to hear about RFPs).
 */
export async function vendorContacts(vendorIds: string[]): Promise<Map<string, VendorContact>> {
  const out = new Map<string, VendorContact>()
  const ids = [...new Set(vendorIds)].filter(Boolean)
  if (!ids.length) return out

  const admin = createAdminClient()
  const { data: vendors } = await admin.from("vendors").select("id, company_name, profile_id, application_id").in("id", ids)

  const appIds = (vendors ?? []).filter((v) => !v.profile_id && v.application_id).map((v) => v.application_id as string)
  const appEmail = new Map<string, string>()
  if (appIds.length) {
    const { data: apps } = await admin.from("vendor_applications").select("id, sales_rep_email").in("id", appIds)
    for (const a of apps ?? []) if (a.sales_rep_email) appEmail.set(a.id as string, a.sales_rep_email as string)
  }

  await Promise.all(
    (vendors ?? []).map(async (v) => {
      const email = v.profile_id ? await emailForProfile(v.profile_id as string) : (appEmail.get(v.application_id as string) ?? null)
      out.set(v.id as string, { companyName: (v.company_name as string) ?? "Supplier", email })
    })
  )
  return out
}
