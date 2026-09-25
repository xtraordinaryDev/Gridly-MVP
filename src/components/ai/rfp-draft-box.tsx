"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Sparkles, Wand2 } from "lucide-react"

import { draftRfp, type RfpDraftValues } from "@/app/ai/actions"
import { AiBadge, AiPanel, AiThinking } from "@/components/ai/ai-ui"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const EXAMPLES = [
  "Diesel for six hospital backup generators in Minnesota and Wisconsin, quarterly top-offs, wet-hose required, tickets within 24 hours",
  "Emergency dyed diesel for road crews in Iowa, 350,000 gallons, need it within 48 hours",
  "Annual unleaded and premium for a 300-bus fleet across four Chicago depots, priced off OPIS Chicago rack",
]

export function RfpDraftBox({ onDraft }: { onDraft: (values: RfpDraftValues) => void }) {
  const [text, setText] = useState("")
  const [assumptions, setAssumptions] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  return (
    <AiPanel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wand2 className="size-4 text-brand-blue" />
          <h2 className="text-sm font-semibold text-navy">Describe what you need</h2>
          <AiBadge />
        </div>
        <span className="text-xs text-muted-foreground">Fills every step; you review before publishing.</span>
      </div>
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Diesel for six hospital backup generators in MN and WI, quarterly top-offs, wet-hose required"
        className="mt-3"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && text.trim()) run()
        }}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border border-border px-2.5 py-1 text-left text-[11px] text-muted-foreground hover:border-brand-blue/40 hover:text-foreground">
            {ex.length > 64 ? ex.slice(0, 64) + "…" : ex}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        {isPending ? <AiThinking label="Drafting your RFP…" /> : assumptions.length ? (
          <ul className="text-xs text-muted-foreground">
            <li className="font-medium text-navy">Assumed, please check:</li>
            {assumptions.map((a) => <li key={a}>· {a}</li>)}
          </ul>
        ) : <span />}
        <Button type="button" size="sm" disabled={isPending || text.trim().length < 8} onClick={run} className="gap-1.5">
          <Sparkles className="size-3.5" />
          Draft with AI
        </Button>
      </div>
    </AiPanel>
  )

  function run() {
    startTransition(async () => {
      const res = await draftRfp(text)
      if (res.ok) {
        setAssumptions(res.data.assumptions)
        onDraft(res.data)
        toast.success("Draft filled in. Step through and adjust anything.")
      } else toast.error(res.message)
    })
  }
}
