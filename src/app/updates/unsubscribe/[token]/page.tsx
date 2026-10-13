import type { Metadata } from "next"
import Link from "next/link"

import { GridLinkLogo } from "@/components/brand/logo"
import { isUuid } from "@/lib/storage/paths"
import { unsubscribeUpdateContact } from "@/lib/data/updates"

export const metadata: Metadata = {
  title: "Unsubscribe — GridLink",
  robots: { index: false, follow: false },
}

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = isUuid(token) ? await unsubscribeUpdateContact(token) : { ok: false as const }

  return (
    <main className="flex min-h-screen items-center justify-center bg-accent/30 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <GridLinkLogo />
        </div>
        {result.ok ? (
          <>
            <h1 className="text-xl font-bold text-navy">You&rsquo;re unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.email} won&rsquo;t receive GridLink company updates any more. Changed your mind? Reply to any
              update we sent and we&rsquo;ll add you back.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-navy">Link not recognised</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This unsubscribe link isn&rsquo;t valid. Reply to the update you received and we&rsquo;ll take you off the
              list by hand.
            </p>
          </>
        )}
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand-blue hover:underline">
          Back to gridlink.global
        </Link>
      </div>
    </main>
  )
}
