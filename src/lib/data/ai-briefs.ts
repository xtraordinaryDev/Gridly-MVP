import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import type { BidBrief } from "@/lib/ai/schemas"

export interface StoredBrief {
  brief: BidBrief
  generatedAt: string
  hash: string
}

const mockBriefs = new Map<string, StoredBrief>()

/**
 * Briefs name every bidder and their price, so they live in rfp_ai_briefs —
 * RLS on, no policies, service role only — not on the rfps row, which invited
 * vendors can read. Every call checks the caller owns the RFP first.
 *
 * Until migration 0017 is applied that table doesn't exist; fall back to the
 * old rfps.ai_brief columns so nothing breaks in between.
 */
function tableMissing(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01"
}

async function ownsRfp(rfpId: string, buyerId: string): Promise<boolean> {
  const { data } = await createAdminClient().from("rfps").select("id").eq("id", rfpId).eq("buyer_id", buyerId).maybeSingle()
  return Boolean(data)
}

export async function getStoredBrief(rfpId: string, buyerId: string): Promise<StoredBrief | null> {
  if (!isSupabaseConfigured()) return mockBriefs.get(rfpId) ?? null
  if (!(await ownsRfp(rfpId, buyerId))) return null
  const admin = createAdminClient()
  const { data, error } = await admin.from("rfp_ai_briefs").select("brief, input_hash, generated_at").eq("rfp_id", rfpId).maybeSingle()
  if (!tableMissing(error)) {
    if (!data?.brief) return null
    return { brief: data.brief as BidBrief, generatedAt: data.generated_at as string, hash: (data.input_hash as string) ?? "" }
  }
  const { data: legacy } = await admin.from("rfps").select("ai_brief, ai_brief_at, ai_brief_hash").eq("id", rfpId).maybeSingle()
  if (!legacy?.ai_brief) return null
  return { brief: legacy.ai_brief as BidBrief, generatedAt: legacy.ai_brief_at as string, hash: (legacy.ai_brief_hash as string) ?? "" }
}

export async function storeBrief(rfpId: string, buyerId: string, brief: BidBrief, hash: string): Promise<void> {
  const generatedAt = new Date().toISOString()
  if (!isSupabaseConfigured()) {
    mockBriefs.set(rfpId, { brief, generatedAt, hash })
    return
  }
  if (!(await ownsRfp(rfpId, buyerId))) return
  const admin = createAdminClient()
  const { error } = await admin.from("rfp_ai_briefs").upsert({ rfp_id: rfpId, brief, input_hash: hash, generated_at: generatedAt }, { onConflict: "rfp_id" })
  if (tableMissing(error)) {
    await admin.from("rfps").update({ ai_brief: brief, ai_brief_at: generatedAt, ai_brief_hash: hash }).eq("id", rfpId)
  } else if (error) {
    console.error("storeBrief failed:", error.message)
  }
}
