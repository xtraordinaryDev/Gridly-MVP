/**
 * Storage path rules. The server computes every upload path; these validators
 * are for the places a stored path comes back from a client (saving an RFP, a
 * bid, a delivery) and for authorising downloads. Pure — safe on either side.
 */

export type UploadKind = "document" | "logo" | "attachment" | "bol"

const PDF_AND_IMAGES = ["pdf", "png", "jpg", "jpeg"]

export const UPLOAD_RULES: Record<UploadKind, { bucket: "vendor-documents" | "rfp-attachments" | "delivery-docs"; maxMb: number; extensions: string[] }> = {
  document: { bucket: "vendor-documents", maxMb: 10, extensions: PDF_AND_IMAGES },
  // No SVG: it can carry script and is served from the storage origin.
  logo: { bucket: "vendor-documents", maxMb: 10, extensions: ["png", "jpg", "jpeg"] },
  attachment: { bucket: "rfp-attachments", maxMb: 15, extensions: [...PDF_AND_IMAGES, "xlsx", "xls", "csv", "docx"] },
  bol: { bucket: "delivery-docs", maxMb: 15, extensions: PDF_AND_IMAGES },
}

/** The content type we store per extension — never the browser's claim. */
export const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

// What browsers actually report for these extensions, beyond the canonical type.
const MIME_ALIASES: Record<string, string[]> = {
  jpg: ["image/jpg", "image/pjpeg"],
  jpeg: ["image/jpg", "image/pjpeg"],
  csv: ["application/vnd.ms-excel", "application/csv", "text/plain", "text/comma-separated-values"],
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID.test(value)
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf(".")
  return i > 0 ? name.slice(i + 1).toLowerCase() : ""
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ""
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".").replace(/^[._]+/, "")
  return clean.slice(-120) || "file"
}

/** Checks a file's name, declared type and size against the rules for `kind`. */
export function checkUpload(kind: UploadKind, file: { name: string; size: number; type?: string | null }): { ok: true; contentType: string } | { ok: false; message: string } {
  const rule = UPLOAD_RULES[kind]
  const ext = fileExtension(file.name)
  const allowed = rule.extensions.map((e) => e.toUpperCase()).filter((e) => e !== "JPEG").join(", ")
  if (!rule.extensions.includes(ext)) return { ok: false, message: `That file type isn't accepted. Upload one of: ${allowed}.` }
  if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, message: "That file is empty." }
  if (file.size > rule.maxMb * 1024 * 1024) return { ok: false, message: `Files must be under ${rule.maxMb} MB.` }
  const contentType = CONTENT_TYPES[ext]
  const declared = (file.type ?? "").toLowerCase().split(";")[0].trim()
  if (declared && declared !== "application/octet-stream" && declared !== contentType && !(MIME_ALIASES[ext] ?? []).includes(declared)) {
    return { ok: false, message: `That file doesn't look like a ${ext.toUpperCase()}.` }
  }
  return { ok: true, contentType }
}

/** Relative, normalised, no traversal, no odd characters. Every validator below starts here. */
export function isSafeStoragePath(path: unknown): path is string {
  if (typeof path !== "string" || !path || path.length > 400) return false
  if (path.startsWith("/") || path.includes("\\") || path.includes("//") || path.includes("%")) return false
  return path.split("/").every((seg) => seg !== "" && seg !== "." && seg !== ".." && /^[a-zA-Z0-9._-]+$/.test(seg))
}

function under(path: unknown, prefix: string, segments: number): path is string {
  return isSafeStoragePath(path) && path.startsWith(prefix) && path.split("/").length === segments
}

/** rfps/{buyer id}/{file} — the only shape a buyer may newly reference. */
export function isRfpAttachmentPath(path: unknown, buyerId: string): path is string {
  return isUuid(buyerId) && under(path, `rfps/${buyerId}/`, 3)
}

/** bids/{rfp id}/{vendor id}/{file} */
export function isBidAttachmentPath(path: unknown, rfpId: string, vendorId: string): path is string {
  return isUuid(rfpId) && isUuid(vendorId) && under(path, `bids/${rfpId}/${vendorId}/`, 4)
}

/** deliveries/{contract id}/{file} */
export function isBolPath(path: unknown, contractId: string): path is string {
  return isUuid(contractId) && under(path, `deliveries/${contractId}/`, 3)
}

/** vendors/{vendor id}/{document type}/{file} */
export function isVendorDocumentPath(path: unknown, vendorId: string, type?: string): path is string {
  return isUuid(vendorId) && under(path, type ? `vendors/${vendorId}/${type}/` : `vendors/${vendorId}/`, 4)
}

/**
 * applications/{application id}/{type}/{file}, or the pre-0017 shape
 * {application id}/{type}/{file} that existing applications already store.
 */
export function isApplicationDocumentPath(path: unknown, applicationId: string): path is string {
  if (!isUuid(applicationId)) return false
  return under(path, `applications/${applicationId}/`, 4) || under(path, `${applicationId}/`, 3)
}

/**
 * Attachments a buyer may save on an RFP: ones they uploaded (rfps/{buyer}/…),
 * plus any already stored on the row being edited or copied — older RFPs keep
 * files under rfps/{rfp id}/… and rfps/new-…/…, which can't be tied to a buyer
 * by path alone. Returns null if anything else is present.
 */
export function ownedRfpAttachments<T extends { path: string }>(incoming: T[], buyerId: string, alreadyStored: { path: string }[] = []): T[] | null {
  const kept = new Set(alreadyStored.map((a) => a.path))
  return incoming.every((a) => kept.has(a.path) || isRfpAttachmentPath(a.path, buyerId)) ? incoming : null
}

/** A bid's attachment path is acceptable if it is unchanged from the stored bid or was uploaded for this RFP by this vendor. */
export function ownedBidAttachment(path: string | null | undefined, rfpId: string, vendorId: string, alreadyStored?: string | null): boolean {
  if (!path) return true
  return path === alreadyStored || isBidAttachmentPath(path, rfpId, vendorId)
}
