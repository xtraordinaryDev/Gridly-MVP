import { z } from "zod"

import { DELIVERY_CAPABILITIES, SPECIAL_CERTIFICATIONS, US_STATES } from "@/lib/schemas/vendor-application"
import { RFP_FUEL_TYPES } from "@/lib/schemas/rfp-wizard"

/** What the model fills in from a one-sentence description. */
export const RfpDraftSchema = z.object({
  title: z.string().describe("Short, specific RFP title, e.g. 'Backup Generator Diesel — 6 Hospital Campuses'"),
  description: z.string().describe("2–4 sentences a supplier would need: what, where, how often, any constraints"),
  fuelType: z.enum(RFP_FUEL_TYPES),
  quantityGallons: z.number().int().positive().describe("Best estimate of total gallons for the term; infer from fleet or site details if not stated"),
  recurrence: z.enum(["one_time", "recurring"]),
  urgency: z.enum(["standard", "rush", "emergency"]),
  pricingMode: z.enum(["fixed", "index"]).describe("index when the buyer mentions rack, OPIS, Platts, index, or floating price; otherwise fixed"),
  indexName: z.string().nullable().describe("Index name if pricingMode is index, e.g. 'OPIS Chicago Rack ULSD'; otherwise null"),
  deliveryStates: z.array(z.enum(US_STATES)).min(1),
  requiredCapabilities: z.array(z.enum(DELIVERY_CAPABILITIES)),
  requiredCertifications: z.array(z.enum(SPECIAL_CERTIFICATIONS)),
  insuranceRequirements: z.string().nullable().describe("e.g. '$2M general liability, $1M auto' or null"),
  bidDueInDays: z.number().int().min(1).max(60).describe("Days from today for bids to be due; emergency 1–2, rush 3–5, standard 10–21"),
  decisionInDays: z.number().int().min(1).max(90).describe("Days from today for the award decision; after bidDueInDays"),
  expectedAwardInDays: z.number().int().min(1).max(120).describe("Days from today for expected award / start; after decisionInDays"),
  assumptions: z.array(z.string()).describe("Anything you inferred that the buyer should double-check, max 4 short items"),
})
export type RfpDraft = z.infer<typeof RfpDraftSchema>

/** Ranked supplier suggestions for an RFP. */
export const SupplierRankingSchema = z.object({
  summary: z.string().describe("One sentence on what drove the ranking, e.g. 'Ranked on Minnesota coverage, wet-hose capability, and on-time history.'"),
  ranked: z.array(
    z.object({
      vendorId: z.string(),
      fit: z.number().int().min(0).max(100).describe("Fit score 0–100"),
      reason: z.string().describe("One specific sentence citing the supplier's data, under 25 words"),
      tags: z.array(z.string()).max(3).describe("Up to 3 short tags like 'Nationwide', 'DBE', '96% on time', 'Emergency <4h'"),
      recommended: z.boolean().describe("true for the suppliers you would invite; aim for 3–8 recommended"),
    })
  ),
})
export type SupplierRanking = z.infer<typeof SupplierRankingSchema>

/** Bid comparison brief for the buyer. */
export const BidBriefSchema = z.object({
  headline: z.string().describe("One sentence verdict, e.g. 'Heartland is lowest by 4% and the only DBE bid; Apex is the safer delivery record.'"),
  recommendation: z.object({
    vendorId: z.string(),
    vendorName: z.string(),
    why: z.string().describe("2–3 sentences justifying the pick with numbers from the bids"),
  }),
  comparison: z.array(
    z.object({
      vendorId: z.string(),
      vendorName: z.string(),
      verdict: z.enum(["recommended", "strong_alternative", "consider", "pass"]),
      strengths: z.array(z.string()).max(3),
      concerns: z.array(z.string()).max(3),
    })
  ),
  risks: z.array(z.string()).max(4).describe("Cross-cutting risks: short validity windows, index exposure, thin coverage, expiring insurance"),
  negotiation: z.array(z.string()).max(3).describe("Concrete asks before award, e.g. 'Ask Apex to match Heartland's net-45 terms'"),
})
export type BidBrief = z.infer<typeof BidBriefSchema>
