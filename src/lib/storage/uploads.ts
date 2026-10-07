import "server-only"

import { randomBytes } from "node:crypto"

import { createAdminClient } from "@/lib/supabase/admin"
import { UPLOAD_RULES, checkUpload, sanitizeFileName, type UploadKind } from "@/lib/storage/paths"

export interface UploadFileInfo {
  name: string
  size: number
  type?: string | null
}

export interface UploadTicket {
  bucket: string
  path: string
  token: string
  contentType: string
}

export type UploadTicketResult = ({ ok: true } & UploadTicket) | { ok: false; message: string }

export function parseFileInfo(value: unknown): UploadFileInfo | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  if (typeof v.name !== "string" || !v.name.trim() || v.name.length > 300 || typeof v.size !== "number") return null
  return { name: v.name, size: v.size, type: typeof v.type === "string" ? v.type : null }
}

/**
 * Issues a one-time signed upload URL for `{prefix}/{unique}-{file name}`.
 * The caller has already decided the uploader owns `prefix`; the buckets have
 * no client policies, so this is the only way a browser can write to them.
 */
export async function issueUploadTicket(kind: UploadKind, prefix: string, file: UploadFileInfo): Promise<UploadTicketResult> {
  const check = checkUpload(kind, file)
  if (!check.ok) return check
  const { bucket } = UPLOAD_RULES[kind]
  const path = `${prefix}/${Date.now()}-${randomBytes(4).toString("hex")}-${sanitizeFileName(file.name)}`
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) {
    console.error("issueUploadTicket failed:", error?.message)
    return { ok: false, message: "Couldn't start the upload. Please try again." }
  }
  return { ok: true, bucket, path: data.path, token: data.token, contentType: check.contentType }
}

/** True once the browser has actually put the object there. */
export async function uploadExists(bucket: string, path: string): Promise<boolean> {
  const { data } = await createAdminClient().storage.from(bucket).exists(path)
  return Boolean(data)
}
