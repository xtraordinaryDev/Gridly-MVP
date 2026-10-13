import { requireAdmin } from "@/lib/auth"
import { isEmailConfigured } from "@/lib/email"
import { listUpdateContacts, listUpdateSends, updatesFromAddress } from "@/lib/data/updates"
import { UpdatesWorkspace } from "./updates-workspace"

// A send to a few hundred contacts runs in batches of 100 with a short pause
// between them; give the server action room to finish.
export const maxDuration = 60

export default async function AdminUpdatesPage() {
  const { preview } = await requireAdmin()
  const [contacts, sends] = await Promise.all([listUpdateContacts(), listUpdateSends()])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Updates</h1>
        <p className="mt-1 text-muted-foreground">
          Your investor, mentor and customer list, and the updates you send them.
        </p>
      </div>

      <UpdatesWorkspace
        contacts={contacts}
        sends={sends}
        fromAddress={updatesFromAddress()}
        emailConfigured={isEmailConfigured()}
        preview={preview}
      />
    </div>
  )
}
