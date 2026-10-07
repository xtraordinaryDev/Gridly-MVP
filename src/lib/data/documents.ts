import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { BUSINESS_TZ } from "@/lib/rfp/dates"
import { fileExtension, isApplicationDocumentPath, isSafeStoragePath, isVendorDocumentPath } from "@/lib/storage/paths"
import { uploadExists } from "@/lib/storage/uploads"

export const DOCUMENT_BUCKET = "vendor-documents"

export type DocumentType = "w9" | "coi" | "distributor_license" | "dot" | "certification" | "other"

export const DOCUMENT_TYPES: { type: DocumentType; label: string; required: boolean; hasExpiry?: boolean; expiryRequired?: boolean; hint: string }[] = [
  { type: "w9", label: "W-9", required: true, hint: "IRS Form W-9 for your legal entity." },
  { type: "coi", label: "Certificate of Insurance", required: true, hasExpiry: true, expiryRequired: true, hint: "Current COI showing general liability and auto coverage." },
  { type: "distributor_license", label: "Distributor License", required: false, hasExpiry: true, expiryRequired: true, hint: "State fuel distributor or supplier license." },
  { type: "dot", label: "DOT / MC Authority", required: false, hint: "USDOT registration or operating authority." },
  { type: "certification", label: "Certifications", required: false, hasExpiry: true, hint: "DBE, MBE, WBE, or other certifications." },
  { type: "other", label: "Other", required: false, hint: "Anything else the GridLink team asked for." },
]

export interface VendorDocument {
  id: string
  type: DocumentType
  fileName: string
  path: string
  uploadedAt: string
  /** Calendar day, YYYY-MM-DD. */
  expiresAt: string | null
  isExpired: boolean
  expiresSoon: boolean
}

const MOCK_DOCS: VendorDocument[] = [
  { id: "d1", type: "w9", fileName: "W9-Apex-2026.pdf", path: "mock/w9", uploadedAt: "2026-05-20T10:00:00Z", expiresAt: null, isExpired: false, expiresSoon: false },
  { id: "d2", type: "coi", fileName: "COI-Apex-2026.pdf", path: "mock/coi", uploadedAt: "2026-05-20T10:00:00Z", expiresAt: "2027-05-01", isExpired: false, expiresSoon: false },
]

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * An expiry is a calendar day. The column is timestamptz holding midnight UTC
 * of that day, so read the day straight off the front rather than through a
 * Date, which would shift it in any timezone west of UTC.
 */
export function expiryDay(expiresAt: string | null | undefined): string | null {
  const day = expiresAt ? String(expiresAt).slice(0, 10) : ""
  return DATE_ONLY.test(day) ? day : null
}

/** Whole days from today (US Central) to the expiry day; 0 = expires today, still valid. */
export function daysUntilExpiry(expiresAt: string | null | undefined): number | null {
  const day = expiryDay(expiresAt)
  if (!day) return null
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(new Date())
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)
}

function expiryFlags(expiresAt: string | null) {
  const days = daysUntilExpiry(expiresAt)
  if (days === null) return { isExpired: false, expiresSoon: false }
  return { isExpired: days < 0, expiresSoon: days >= 0 && days <= 30 }
}

function validExpiry(value: string | null | undefined): string | null {
  if (!value || !DATE_ONLY.test(value)) return null
  const t = Date.parse(`${value}T00:00:00Z`)
  // Round-trip rejects 2026-02-31; the year bounds reject typos like 0202.
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== value) return null
  const year = Number(value.slice(0, 4))
  return year >= 2000 && year <= 2100 ? value : null
}

export async function listVendorDocuments(vendorId: string): Promise<VendorDocument[]> {
  if (!isSupabaseConfigured()) return MOCK_DOCS
  const { data } = await createAdminClient().from("vendor_documents").select("*").eq("vendor_id", vendorId).order("uploaded_at", { ascending: false })
  return (data ?? []).map((d) => ({
    id: d.id as string,
    type: d.document_type as DocumentType,
    fileName: d.file_name as string,
    path: d.file_url as string,
    uploadedAt: d.uploaded_at as string,
    expiresAt: expiryDay(d.expires_at as string | null),
    ...expiryFlags((d.expires_at as string) ?? null),
  }))
}

/**
 * Record an upload the browser made through a server-issued signed URL;
 * replaces any earlier file of the same type. `expiresAt` undefined keeps the
 * previous expiry on a replace; an explicit null clears it (optional types only).
 */
export async function recordVendorDocument(vendorId: string, input: { type: DocumentType; path: string; fileName: string; expiresAt?: string | null }) {
  const spec = DOCUMENT_TYPES.find((t) => t.type === input.type)
  if (!spec) return { ok: false as const, message: "Unknown document type." }
  const given = input.expiresAt ? validExpiry(input.expiresAt) : null
  if (input.expiresAt && !given) return { ok: false as const, message: "Enter a valid expiry date." }
  if (!isSupabaseConfigured()) {
    const i = MOCK_DOCS.findIndex((d) => d.type === input.type)
    const expiresAt = spec.hasExpiry ? given ?? (input.expiresAt === undefined ? MOCK_DOCS[i]?.expiresAt ?? null : null) : null
    if (spec.expiryRequired && !expiresAt) return { ok: false as const, message: `Enter the expiry date for your ${spec.label}.` }
    const doc: VendorDocument = { id: `d-${Date.now()}`, type: input.type, fileName: input.fileName, path: input.path, uploadedAt: new Date().toISOString(), expiresAt, ...expiryFlags(expiresAt) }
    if (i >= 0) MOCK_DOCS[i] = doc
    else MOCK_DOCS.push(doc)
    return { ok: true as const }
  }
  if (!isVendorDocumentPath(input.path, vendorId, input.type)) return { ok: false as const, message: "Invalid file path." }
  const admin = createAdminClient()
  const { data: prev } = await admin.from("vendor_documents").select("id, file_url, expires_at").eq("vendor_id", vendorId).eq("document_type", input.type).order("uploaded_at", { ascending: false })
  const expiresAt = spec.hasExpiry ? given ?? (input.expiresAt === undefined ? expiryDay(prev?.[0]?.expires_at as string | null) : null) : null
  if (spec.expiryRequired && !expiresAt) return { ok: false as const, message: `Enter the expiry date for your ${spec.label}.` }
  if (!(await uploadExists(DOCUMENT_BUCKET, input.path))) return { ok: false as const, message: "The upload didn't finish. Please try again." }
  const { error } = await admin.from("vendor_documents").insert({
    vendor_id: vendorId,
    document_type: input.type,
    file_url: input.path,
    file_name: input.fileName.slice(0, 200),
    expires_at: expiresAt,
  })
  if (error) return { ok: false as const, message: "Couldn't record the document." }
  if (prev?.length) {
    await admin.from("vendor_documents").delete().in("id", prev.map((p) => p.id as string))
    // Only ever delete inside this vendor's own folder, whatever an old row says.
    const paths = prev.map((p) => p.file_url as string).filter((p) => p !== input.path && isVendorDocumentPath(p, vendorId))
    if (paths.length) await admin.storage.from(DOCUMENT_BUCKET).remove(paths)
  }
  return { ok: true as const }
}

const INLINE_SAFE = ["pdf", "png", "jpg", "jpeg"]

async function signDocument(path: string): Promise<string | null> {
  // Older uploads weren't type-checked; anything but a PDF or image downloads instead of rendering.
  const { data } = await createAdminClient().storage.from(DOCUMENT_BUCKET).createSignedUrl(path, 300, { download: !INLINE_SAFE.includes(fileExtension(path)) })
  return data?.signedUrl ?? null
}

export async function signedDocumentUrl(vendorId: string, documentId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const admin = createAdminClient()
  const [{ data: doc }, { data: vendor }] = await Promise.all([
    admin.from("vendor_documents").select("file_url").eq("id", documentId).eq("vendor_id", vendorId).maybeSingle(),
    admin.from("vendors").select("application_id").eq("id", vendorId).maybeSingle(),
  ])
  const path = doc?.file_url as string | undefined
  if (!path || !isSafeStoragePath(path)) return null
  // Documents uploaded during registration stay in the application's folder and
  // are referenced from there after approval; they're still this vendor's own.
  const applicationId = vendor?.application_id as string | null | undefined
  if (!isVendorDocumentPath(path, vendorId) && !(applicationId && isApplicationDocumentPath(path, applicationId))) return null
  return signDocument(path)
}

/**
 * Signed URL for a file a vendor uploaded during onboarding. For the admin
 * review screen — the caller must have checked requireAdmin(). The path has to
 * be one this application actually stores, inside its own folder.
 */
export async function signedApplicationDocumentUrl(applicationId: string, path: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !isSafeStoragePath(path) || !isApplicationDocumentPath(path, applicationId)) return null
  const { data: app } = await createAdminClient().from("vendor_applications").select("documents").eq("id", applicationId).maybeSingle()
  const stored = Object.values((app?.documents as Record<string, { path?: string } | null> | null) ?? {}).some((d) => d?.path === path)
  return stored ? signDocument(path) : null
}

export interface ComplianceIssue {
  vendorId: string
  vendorName: string
  type: DocumentType
  label: string
  kind: "expired" | "expiring" | "missing"
  expiresAt: string | null
  daysLeft: number | null
  fileName: string | null
}

/** Expired, expiring (≤30d), and missing required docs for every verified vendor. */
export async function listComplianceIssues(): Promise<ComplianceIssue[]> {
  if (!isSupabaseConfigured()) {
    return [
      { vendorId: "v1", vendorName: "Gulfstream Fuels", type: "coi", label: "Certificate of Insurance", kind: "expired", expiresAt: "2026-08-30", daysLeft: -22, fileName: "COI-2025.pdf" },
      { vendorId: "v2", vendorName: "Prairie States Petroleum", type: "coi", label: "Certificate of Insurance", kind: "expiring", expiresAt: "2026-10-10", daysLeft: 19, fileName: "COI-2026.pdf" },
      { vendorId: "v3", vendorName: "Summit Petroleum LLC", type: "w9", label: "W-9", kind: "missing", expiresAt: null, daysLeft: null, fileName: null },
    ]
  }
  const admin = createAdminClient()
  const [{ data: vendors }, { data: docs }] = await Promise.all([
    admin.from("vendors").select("id, company_name").eq("is_verified", true).order("company_name"),
    admin.from("vendor_documents").select("vendor_id, document_type, file_name, expires_at").order("uploaded_at", { ascending: false }),
  ])
  const byVendor = new Map<string, typeof docs>()
  for (const d of docs ?? []) byVendor.set(d.vendor_id as string, [...(byVendor.get(d.vendor_id as string) ?? []), d])
  const out: ComplianceIssue[] = []
  for (const v of vendors ?? []) {
    const mine = byVendor.get(v.id as string) ?? []
    for (const t of DOCUMENT_TYPES) {
      const doc = mine.find((d) => d.document_type === t.type)
      if (!doc) {
        if (t.required) out.push({ vendorId: v.id as string, vendorName: v.company_name as string, type: t.type, label: t.label, kind: "missing", expiresAt: null, daysLeft: null, fileName: null })
        continue
      }
      const days = daysUntilExpiry(doc.expires_at as string | null)
      if (days === null) continue
      const expiresAt = expiryDay(doc.expires_at as string)
      if (days < 0) out.push({ vendorId: v.id as string, vendorName: v.company_name as string, type: t.type, label: t.label, kind: "expired", expiresAt, daysLeft: days, fileName: doc.file_name as string })
      else if (days <= 30) out.push({ vendorId: v.id as string, vendorName: v.company_name as string, type: t.type, label: t.label, kind: "expiring", expiresAt, daysLeft: days, fileName: doc.file_name as string })
    }
  }
  const rank = { expired: 0, expiring: 1, missing: 2 }
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
}
