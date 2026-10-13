import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import type { z } from "zod"

/** Model for every GridLink AI feature. */
export const AI_MODEL = "claude-opus-5"

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

let client: Anthropic | null = null
function getClient() {
  if (!client) {
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim()
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 2,
      timeout: 60_000,
      ...(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {}),
    })
  }
  return client
}

export type AiResult<T> = { ok: true; data: T; usage: { input: number; output: number } } | { ok: false; message: string }

const SYSTEM_BASE = `You are GridLink AI, the procurement assistant inside GridLink, a marketplace where enterprise fuel buyers run RFPs and award contracts to verified fuel suppliers (diesel, gasoline, DEF, jet fuel, propane, heating oil, renewable diesel).
Be concrete and specific to the data you are given. Never invent suppliers, prices, or facts that are not in the input. Keep language plain and confident; no filler, no disclaimers.`

/**
 * One structured call: system + user prompt in, schema-validated object out.
 * Effort defaults to low for interactive UI features; raise for analysis.
 */
export type AiFeature = "rfp_draft" | "supplier_match" | "bid_brief"

/**
 * Records one model call in ai_usage with its list-price cost, so the admin
 * Expenses page shows real token spend. Never throws: a logging failure must
 * not fail the feature that made the call.
 */
async function recordUsage(params: {
  feature: AiFeature
  userId: string | null
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number }
  ok: boolean
}) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const { isSupabaseConfigured } = await import("@/lib/supabase/config")
    if (!isSupabaseConfigured()) return
    const { costMicrodollars } = await import("@/lib/ai/pricing")
    await createAdminClient().from("ai_usage").insert({
      feature: params.feature,
      model: AI_MODEL,
      user_id: params.userId && /^[0-9a-f-]{36}$/i.test(params.userId) ? params.userId : null,
      input_tokens: params.usage.input,
      output_tokens: params.usage.output,
      cache_read_tokens: params.usage.cacheRead,
      cache_write_tokens: params.usage.cacheWrite,
      cost_microdollars: costMicrodollars(AI_MODEL, params.usage),
      ok: params.ok,
    })
  } catch (err) {
    console.error("[ai] usage log failed:", err)
  }
}

export async function aiParse<S extends z.ZodType>(opts: {
  schema: S
  purpose: string
  user: string
  effort?: "low" | "medium" | "high"
  maxTokens?: number
  /** Which product feature made the call; shown on the Expenses page. */
  feature: AiFeature
  /** The signed-in user, for per-account attribution. */
  userId?: string | null
}): Promise<AiResult<z.infer<S>>> {
  if (!isAiConfigured()) return { ok: false, message: "AI features are not configured on this server." }
  try {
    const response = await getClient().messages.parse({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      output_config: { effort: opts.effort ?? "low", format: zodOutputFormat(opts.schema) },
      system: `${SYSTEM_BASE}\n\nTask: ${opts.purpose}`,
      messages: [{ role: "user", content: opts.user }],
    })
    const usage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
      cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
    }
    const usable = response.stop_reason !== "refusal" && Boolean(response.parsed_output)
    void recordUsage({ feature: opts.feature, userId: opts.userId ?? null, usage, ok: usable })
    if (response.stop_reason === "refusal") return { ok: false, message: "The assistant declined this request." }
    if (!response.parsed_output) return { ok: false, message: "The assistant returned an unreadable answer. Try again." }
    return {
      ok: true,
      data: response.parsed_output as z.infer<S>,
      usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, message: "AI key rejected. Check ANTHROPIC_API_KEY." }
    if (err instanceof Anthropic.BadRequestError) {
      console.error("[ai] bad request:", err.message)
      return { ok: false, message: err.message.includes("workspace") ? "AI key needs a workspace: set ANTHROPIC_WORKSPACE_ID." : "AI request was rejected." }
    }
    if (err instanceof Anthropic.RateLimitError) return { ok: false, message: "AI is busy right now. Try again in a moment." }
    if (err instanceof Anthropic.APIError) {
      console.error("[ai] api error:", err.status, err.message)
      return { ok: false, message: "AI service error. Try again." }
    }
    console.error("[ai] error:", err)
    return { ok: false, message: "Couldn't reach the AI service." }
  }
}
