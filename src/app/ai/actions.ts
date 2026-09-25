"use server"

import { createHash } from "crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireBuyer } from "@/lib/auth"
import { aiParse, isAiConfigured } from "@/lib/ai/claude"
import { BidBriefSchema, RfpDraftSchema, SupplierRankingSchema, type BidBrief, type SupplierRanking } from "@/lib/ai/schemas"
import { listVerifiedVendors } from "@/lib/data/directory"
import { listVendorPerformance } from "@/lib/data/ratings"
import { getBuyerRfpDetail } from "@/lib/data/rfps"
import { listAddressOptions } from "@/lib/data/sites"
import { getStoredBrief, storeBrief } from "@/lib/data/ai-briefs"
import type { RfpWizardInput } from "@/lib/schemas/rfp-wizard"

type Result<T> = { ok: true; data: T } | { ok: false; message: string }

export async function aiAvailable(): Promise<boolean> {
  return isAiConfigured()
}

function plusDays(days: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// 1. Draft an RFP from a sentence
// ---------------------------------------------------------------------------
export type RfpDraftValues = Partial<RfpWizardInput> & { assumptions: string[] }

export async function draftRfp(prompt: string): Promise<Result<RfpDraftValues>> {
  const text = z.string().trim().min(8, "Give the assistant a little more to go on.").max(2000).safeParse(prompt)
  if (!text.success) return { ok: false, message: text.error.issues[0]?.message ?? "Invalid input." }
  const { profile } = await requireBuyer()
  const sites = await listAddressOptions(profile.id)

  const res = await aiParse({
    schema: RfpDraftSchema,
    purpose: "Turn a buyer's short description into a complete fuel RFP draft. Fill every field with the most plausible value; when the buyer names a place, map it to a US state. Use the buyer's saved sites to infer states and scale.",
    user: [
      `Buyer: ${profile.companyName ?? "Buyer"}`,
      sites.sites.length ? `Saved delivery sites:\n${sites.sites.map((s) => `- ${s.name}: ${s.address}${s.state ? ` (${s.state})` : ""}`).join("\n")}` : "No saved sites.",
      `Today: ${plusDays(0)}`,
      `Buyer's description:\n"""${text.data}"""`,
    ].join("\n\n"),
    effort: "low",
  })
  if (!res.ok) return res
  const d = res.data
  const decision = Math.max(d.decisionInDays, d.bidDueInDays + 1)
  const award = Math.max(d.expectedAwardInDays, decision + 1)
  return {
    ok: true,
    data: {
      title: d.title,
      description: d.description,
      fuelType: d.fuelType,
      quantityGallons: d.quantityGallons,
      recurrence: d.recurrence,
      urgency: d.urgency,
      pricingMode: d.pricingMode,
      indexName: d.pricingMode === "index" ? d.indexName ?? "" : "",
      deliveryStates: d.deliveryStates,
      requiredCapabilities: d.requiredCapabilities,
      requiredCertifications: d.requiredCertifications,
      insuranceRequirements: d.insuranceRequirements ?? "",
      bidDueDate: plusDays(d.bidDueInDays),
      decisionDate: plusDays(decision),
      expectedAwardDate: plusDays(award),
      assumptions: d.assumptions.slice(0, 4),
    },
  }
}

// ---------------------------------------------------------------------------
// 2. Rank suppliers for an RFP
// ---------------------------------------------------------------------------
const RankInput = z.object({
  title: z.string(),
  description: z.string(),
  fuelType: z.string(),
  quantityGallons: z.number(),
  urgency: z.string(),
  pricingMode: z.string(),
  states: z.array(z.string()),
  capabilities: z.array(z.string()),
  certifications: z.array(z.string()),
  candidateIds: z.array(z.string()).min(1).max(40),
})

export type RankedSupplier = SupplierRanking["ranked"][number] & { companyName: string }

export async function rankSuppliers(values: unknown): Promise<Result<{ summary: string; ranked: RankedSupplier[] }>> {
  const parsed = RankInput.safeParse(values)
  if (!parsed.success) return { ok: false, message: "Invalid request." }
  await requireBuyer()
  const input = parsed.data
  const vendors = (await listVerifiedVendors()).filter((v) => input.candidateIds.includes(v.id))
  if (!vendors.length) return { ok: false, message: "No candidates to rank." }
  const perf = await listVendorPerformance(vendors.map((v) => v.id))

  const lines = vendors.map((v) => {
    const p = perf.get(v.id)
    return [
      `id=${v.id} | ${v.companyName}`,
      `states: ${v.states.join(", ")}${v.nationwide ? " (nationwide)" : ""}`,
      `products: ${v.products.join(", ")}`,
      `capabilities: ${v.deliveryCapabilities.join(", ") || "none listed"}`,
      `certification: ${v.specialCertification ?? "none"} | fleet: ${v.tankwagons} tankwagons, ${v.transports} transports | annual gallons: ${v.annualGallons.toLocaleString("en-US")} | emergency response: ${v.emergencyHours ? `${v.emergencyHours}h` : "not stated"}`,
      `track record: ${p?.avgStars != null ? `${p.avgStars}★ (${p.ratingCount})` : "no ratings"}, on-time ${p?.onTimePct != null ? `${p.onTimePct}%` : "n/a"}, ${p?.awardsCount ?? 0} awards, ${p?.deliveriesCount ?? 0} deliveries`,
    ].join("\n  ")
  })

  const res = await aiParse({
    schema: SupplierRankingSchema,
    purpose: "Rank verified fuel suppliers for this RFP. Weigh geographic coverage first, then required capabilities and certifications, then scale relative to the volume, then track record and emergency responsiveness when urgency is rush or emergency. Return every candidate, ordered best first. Mark 3–8 as recommended unless fewer are viable.",
    user: [
      `RFP: ${input.title}\n${input.description}`,
      `Fuel: ${input.fuelType} · ${input.quantityGallons.toLocaleString("en-US")} gal · urgency ${input.urgency} · pricing ${input.pricingMode}`,
      `Delivery states: ${input.states.join(", ") || "not specified"}`,
      `Required capabilities: ${input.capabilities.join(", ") || "none"}`,
      `Required certifications: ${input.certifications.join(", ") || "none"}`,
      `Candidates (${vendors.length}):\n${lines.join("\n\n")}`,
    ].join("\n\n"),
    effort: "low",
    maxTokens: 6000,
  })
  if (!res.ok) return res
  const names = new Map(vendors.map((v) => [v.id, v.companyName]))
  const ranked = res.data.ranked.filter((r) => names.has(r.vendorId)).map((r) => ({ ...r, companyName: names.get(r.vendorId)! }))
  // Any candidate the model skipped goes to the bottom, unrecommended.
  for (const v of vendors) if (!ranked.some((r) => r.vendorId === v.id)) ranked.push({ vendorId: v.id, companyName: v.companyName, fit: 0, reason: "Not ranked.", tags: [], recommended: false })
  return { ok: true, data: { summary: res.data.summary, ranked } }
}

// ---------------------------------------------------------------------------
// 3. Bid comparison brief
// ---------------------------------------------------------------------------
export async function generateBidBrief(rfpId: string): Promise<Result<{ brief: BidBrief; generatedAt: string }>> {
  const { profile } = await requireBuyer()
  const rfp = await getBuyerRfpDetail(rfpId, profile.id)
  if (!rfp) return { ok: false, message: "RFP not found." }
  if (rfp.responses.length === 0) return { ok: false, message: "No bids to compare yet." }

  const hash = createHash("sha1").update(JSON.stringify(rfp.responses.map((r) => [r.id, r.totalPrice, r.pricePerGallon, r.status, r.submittedAt]))).digest("hex")
  const existing = await getStoredBrief(rfpId, profile.id)
  if (existing && existing.hash === hash) return { ok: true, data: { brief: existing.brief, generatedAt: existing.generatedAt } }

  const perf = await listVendorPerformance(rfp.responses.map((r) => r.vendorId))
  const bids = rfp.responses.map((r) => {
    const p = perf.get(r.vendorId)
    return [
      `vendorId=${r.vendorId} | ${r.companyName}`,
      r.pricingMode === "index"
        ? `pricing: ${r.indexName ?? "index"} ${r.differential != null ? (r.differential >= 0 ? "+" : "-") + " $" + Math.abs(r.differential).toFixed(4) : ""} per gal (estimated $${r.pricePerGallon.toFixed(4)}/gal at today's index)`
        : `pricing: fixed $${r.pricePerGallon.toFixed(4)}/gal`,
      `total: $${r.totalPrice.toLocaleString("en-US")} | terms: ${r.deliveryTerms} | valid ${r.validityDays} days | submitted ${r.submittedAt.slice(0, 10)}`,
      `notes: ${r.notes ?? "—"}${r.attachmentName ? ` | attachment: ${r.attachmentName}` : ""}`,
      `track record: ${p?.avgStars != null ? `${p.avgStars}★ (${p.ratingCount} ratings)` : "no ratings"}, on-time ${p?.onTimePct != null ? `${p.onTimePct}%` : "n/a"}, ${p?.awardsCount ?? 0} prior awards, ${p?.deliveriesCount ?? 0} deliveries`,
    ].join("\n  ")
  })

  const res = await aiParse({
    schema: BidBriefSchema,
    purpose: "Write a bid comparison brief for the buyer deciding which supplier to award. Compare total cost, price structure and index exposure, terms, validity, and delivery track record. Recommend exactly one supplier and be explicit about the trade-offs of the others. Quote the actual numbers.",
    user: [
      `RFP: ${rfp.title}\n${rfp.description}`,
      `Fuel: ${rfp.fuelType} · ${rfp.quantityGallons.toLocaleString("en-US")} gal · ${rfp.recurrence} · urgency ${rfp.urgency} · pricing ${rfp.pricingMode}${rfp.indexName ? ` (${rfp.indexName})` : ""}`,
      `States: ${rfp.deliveryStates.join(", ")} | required capabilities: ${rfp.requiredCapabilities.join(", ") || "none"} | certifications: ${rfp.requiredCertifications.join(", ") || "none"} | insurance: ${rfp.insuranceRequirements ?? "not specified"}`,
      `Bids (${rfp.responses.length}):\n${bids.join("\n\n")}`,
    ].join("\n\n"),
    effort: "medium",
    maxTokens: 6000,
  })
  if (!res.ok) return res
  await storeBrief(rfpId, profile.id, res.data, hash)
  revalidatePath(`/buyer/rfps/${rfpId}`)
  return { ok: true, data: { brief: res.data, generatedAt: new Date().toISOString() } }
}
