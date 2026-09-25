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

export async function getStoredBrief(rfpId: string, buyerId: string): Promise<StoredBrief | null> {
  if (!isSupabaseConfigured()) return mockBriefs.get(rfpId) ?? null
  const { data } = await createAdminClient().from("rfps").select("ai_brief, ai_brief_at, ai_brief_hash").eq("id", rfpId).eq("buyer_id", buyerId).maybeSingle()
  if (!data?.ai_brief) return null
  return { brief: data.ai_brief as BidBrief, generatedAt: data.ai_brief_at as string, hash: (data.ai_brief_hash as string) ?? "" }
}

export async function storeBrief(rfpId: string, buyerId: string, brief: BidBrief, hash: string): Promise<void> {
  const generatedAt = new Date().toISOString()
  if (!isSupabaseConfigured()) {
    mockBriefs.set(rfpId, { brief, generatedAt, hash })
    return
  }
  await createAdminClient().from("rfps").update({ ai_brief: brief, ai_brief_at: generatedAt, ai_brief_hash: hash }).eq("id", rfpId).eq("buyer_id", buyerId)
}
