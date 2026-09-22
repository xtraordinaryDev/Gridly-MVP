import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export const DOCUMENT_BUCKET = "vendor-documents"

export type DocumentType = "w9" | "coi" | "distributor_license" | "dot" | "certification" | "other"

export const DOCUMENT_TYPES: { type: DocumentType; label: string; required: boolean; hasExpiry?: boolean; hint: string }[] = [
  { type: "w9", label: "W-9", required: true, hint: "IRS Form W-9 for your legal entity." },
  { type: "coi", label: "Certificate of Insurance", required: true, hasExpiry: true, hint: "Current COI showing general liability and auto coverage." },
  { type: "distributor_license", label: "Distributor License", required: false, hasExpiry: true, hint: "State fuel distributor or supplier license." },
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
  expiresAt: string | null
  isExpired: boolean
  expiresSoon: boolean
}

const MOCK_DOCS: VendorDocument[] = [
  { id: "d1", type: "w9", fileName: "W9-Apex-2026.pdf", path: "mock/w9", uploadedAt: "2026-05-20T10:00:00Z", expiresAt: null, isExpired: false, expiresSoon: false },
  { id: "d2", type: "coi", fileName: "COI-Apex-2026.pdf", path: "mock/coi", uploadedAt: "2026-05-20T10:00:00Z", expiresAt: "2027-05-01", isExpired: false, expiresSoon: false },
]

function expiryFlags(expiresAt: string | null) {
  if (!expiresAt) return { isExpired: false, expiresSoon: false }
  const days = (new Date(expiresAt).getTime() - Date.now()) / 86400000
  return { isExpired: days < 0, expiresSoon: days >= 0 && days <= 30 }
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
    expiresAt: (d.expires_at as string) ?? null,
    ...expiryFlags((d.expires_at as string) ?? null),
  }))
}

/** Record an upload that the browser already put in storage; replaces any earlier file of the same type. */
export async function recordVendorDocument(vendorId: string, input: { type: DocumentType; path: string; fileName: string; expiresAt?: string | null }) {
  if (!isSupabaseConfigured()) {
    const i = MOCK_DOCS.findIndex((d) => d.type === input.type)
    const doc: VendorDocument = { id: `d-${Date.now()}`, type: input.type, fileName: input.fileName, path: input.path, uploadedAt: new Date().toISOString(), expiresAt: input.expiresAt ?? null, ...expiryFlags(input.expiresAt ?? null) }
    if (i >= 0) MOCK_DOCS[i] = doc
    else MOCK_DOCS.push(doc)
    return { ok: true as const }
  }
  if (!input.path.startsWith(`vendors/${vendorId}/`)) return { ok: false as const, message: "Invalid file path." }
  const admin = createAdminClient()
  const { data: prev } = await admin.from("vendor_documents").select("id, file_url").eq("vendor_id", vendorId).eq("document_type", input.type)
  const { error } = await admin.from("vendor_documents").insert({
    vendor_id: vendorId,
    document_type: input.type,
    file_url: input.path,
    file_name: input.fileName,
    expires_at: input.expiresAt || null,
  })
  if (error) return { ok: false as const, message: "Couldn't record the document." }
  if (prev?.length) {
    await admin.from("vendor_documents").delete().in("id", prev.map((p) => p.id as string))
    const paths = prev.map((p) => p.file_url as string).filter((p) => p !== input.path)
    if (paths.length) await admin.storage.from(DOCUMENT_BUCKET).remove(paths)
  }
  return { ok: true as const }
}

export async function signedDocumentUrl(vendorId: string, documentId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const admin = createAdminClient()
  const { data: doc } = await admin.from("vendor_documents").select("file_url").eq("id", documentId).eq("vendor_id", vendorId).maybeSingle()
  if (!doc) return null
  const { data } = await admin.storage.from(DOCUMENT_BUCKET).createSignedUrl(doc.file_url as string, 300)
  return data?.signedUrl ?? null
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
    admin.from("vendor_documents").select("vendor_id, document_type, file_name, expires_at"),
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
      if (!doc.expires_at) continue
      const days = Math.round((new Date((doc.expires_at as string) + "T12:00:00Z").getTime() - Date.now()) / 86400000)
      if (days < 0) out.push({ vendorId: v.id as string, vendorName: v.company_name as string, type: t.type, label: t.label, kind: "expired", expiresAt: doc.expires_at as string, daysLeft: days, fileName: doc.file_name as string })
      else if (days <= 30) out.push({ vendorId: v.id as string, vendorName: v.company_name as string, type: t.type, label: t.label, kind: "expiring", expiresAt: doc.expires_at as string, daysLeft: days, fileName: doc.file_name as string })
    }
  }
  const rank = { expired: 0, expiring: 1, missing: 2 }
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
}
