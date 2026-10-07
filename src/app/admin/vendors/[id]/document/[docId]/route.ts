import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { adminVendorDocumentUrl } from "@/lib/data/admin-vendors"

// Signed at click time: the bucket is private and a pre-rendered link would expire.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  await requireAdmin()
  const { id, docId } = await params
  const url = await adminVendorDocumentUrl(id, docId)
  if (!url) return new NextResponse("Document not found.", { status: 404 })
  return NextResponse.redirect(url)
}
