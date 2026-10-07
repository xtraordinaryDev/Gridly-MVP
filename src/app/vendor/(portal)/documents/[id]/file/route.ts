import { NextResponse } from "next/server"

import { getSessionProfile } from "@/lib/auth"
import { resolveVendorIdForSession } from "@/lib/data/rfps"
import { signedDocumentUrl } from "@/lib/data/documents"
import { isUuid } from "@/lib/storage/paths"

/**
 * Opens one of the signed-in vendor's own documents. A plain link target so
 * "View" can open in a new tab; redirects to a short-lived signed URL.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const back = new URL("/vendor/documents", request.url)
  const profile = await getSessionProfile()
  if (!profile) return NextResponse.redirect(new URL("/login", request.url))
  if (profile.role !== "vendor" || !isUuid(id)) return NextResponse.redirect(back)
  const vendorId = await resolveVendorIdForSession(profile.id, false)
  const url = await signedDocumentUrl(vendorId, id)
  return NextResponse.redirect(url ?? back)
}
