"use client"

import { useState } from "react"

/**
 * Hidden honeypot field plus time-on-form, sent alongside a public form's
 * values (see botSignal in lib/forms/public-form). Render `field` inside the form.
 */
export function useBotCheck() {
  const [trap, setTrap] = useState("")
  const [mountedAt] = useState(() => Date.now())

  const field = (
    // Off-screen rather than display:none — naive bots skip fields that are obviously hidden.
    <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-auto size-px overflow-hidden">
      <label>
        Fax number (leave blank)
        <input
          type="text"
          name="fax_number"
          tabIndex={-1}
          autoComplete="off"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
        />
      </label>
    </div>
  )

  return { field, meta: () => ({ trap, elapsedMs: Date.now() - mountedAt }) }
}
