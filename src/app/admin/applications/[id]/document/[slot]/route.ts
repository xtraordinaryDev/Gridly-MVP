import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { getApplication, type ApplicationDocuments } from "@/lib/data/applications"
import { signedApplicationDocumentUrl } from "@/lib/data/documents"

const SLOTS: Record<string, keyof ApplicationDocuments> = {
  w9: "w9Form",
  coi: "certificateOfInsurance",
  distributor_license: "distributorLicense",
  logo: "companyLogo",
}

// The bucket is private, so "View" lands here and is redirected to a URL signed
// at click time — a link rendered into the page would expire while it sat open.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; slot: string }> }) {
  await requireAdmin()
  const { id, slot } = await params
  const key = SLOTS[slot]
  const app = key ? await getApplication(id) : null
  const path = key ? app?.documents?.[key]?.path : null
  const url = path ? await signedApplicationDocumentUrl(id, path) : null
  if (!url) return new NextResponse("Document not found.", { status: 404 })
  return NextResponse.redirect(url)
}
