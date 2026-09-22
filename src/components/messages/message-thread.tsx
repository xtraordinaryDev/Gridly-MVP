"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Megaphone, MessageSquare, Send } from "lucide-react"

import type { MessageView, ThreadParty, ThreadType } from "@/lib/data/messages"
import type { PartyRole } from "@/lib/invoicing/types"
import { sendThreadMessage } from "@/app/messages/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function MessageThread({
  threadType,
  threadId,
  messages,
  role,
  vendorId,
  title = "Messages",
  description,
  allowBroadcast = false,
  emptyText = "No messages yet. Start the conversation below.",
  compact = false,
}: {
  threadType: ThreadType
  threadId: string
  messages: MessageView[]
  role: PartyRole
  /** buyer-side RFP threads: which supplier this composer targets */
  vendorId?: string | null
  title?: string
  description?: string
  allowBroadcast?: boolean
  emptyText?: string
  compact?: boolean
}) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [broadcast, setBroadcast] = useState(false)
  const [isPending, startTransition] = useTransition()
  // Messages sent from this page show instantly; the server copy replaces them on refresh.
  const [pending, setPending] = useState<MessageView[]>([])
  const serverIds = new Set(messages.map((m) => m.body + m.senderRole))
  const visible = [...messages, ...pending.filter((m) => !serverIds.has(m.body + m.senderRole))]

  const send = () =>
    startTransition(async () => {
      const body = text
      const wasBroadcast = broadcast
      const res = await sendThreadMessage({ threadType, threadId, vendorId: vendorId ?? "", body, broadcast })
      if (res.ok) {
        setPending((p) => [...p, { id: `local-${Date.now()}`, threadType, threadId, buyerId: "", vendorId: vendorId ?? null, senderRole: role, senderName: "You", body: body.trim(), isBroadcast: wasBroadcast, createdAt: new Date().toISOString() }])
        setText("")
        setBroadcast(false)
        router.refresh()
      } else toast.error(res.message)
    })

  const inner = (
    <>
      {!compact ? (
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-navy">{title}</h2>
        </div>
      ) : null}
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <ol className={cn("space-y-3", compact ? "mt-2" : "mt-4")}>
        {visible.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{emptyText}</li>
        ) : (
          visible.map((m) => {
            const mine = m.senderRole === role
            return (
              <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", mine ? "bg-brand-blue text-white" : "bg-muted text-foreground")}>
                  <p className={cn("mb-1 flex items-center gap-1.5 text-[11px]", mine ? "text-white/80" : "text-muted-foreground")}>
                    {m.isBroadcast ? <Megaphone className="size-3" /> : null}
                    <span className="font-medium">{m.senderName}</span>
                    {m.isBroadcast ? <span>· to all suppliers</span> : null}
                    <span suppressHydrationWarning>· {fmt(m.createdAt)}</span>
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </li>
            )
          })
        )}
      </ol>
      <div className="mt-4 space-y-2">
        <Textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={broadcast ? "Post an answer every invited supplier will see…" : "Write a message…"}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && text.trim()) send()
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {allowBroadcast ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} className="size-3.5" />
              <Megaphone className="size-3.5" />
              Broadcast to all invited suppliers
            </label>
          ) : <span />}
          <Button size="sm" disabled={isPending || !text.trim()} onClick={send} className="gap-1.5">
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            {broadcast ? "Post to all" : "Send"}
          </Button>
        </div>
      </div>
    </>
  )

  if (compact) return <div>{inner}</div>
  return (
    <Card>
      <CardContent className="p-6">{inner}</CardContent>
    </Card>
  )
}

/** Buyer view of an RFP's Q&A: pick a supplier thread, or broadcast. */
export function RfpQandA({
  rfpId,
  parties,
  activeVendorId,
  messages,
}: {
  rfpId: string
  parties: ThreadParty[]
  activeVendorId: string | null
  messages: MessageView[]
}) {
  const router = useRouter()
  const active = parties.find((p) => p.vendorId === activeVendorId) ?? null
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="p-3">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suppliers</p>
          <ul className="mt-1 space-y-0.5">
            <li>
              <button type="button" onClick={() => router.push(`/buyer/rfps/${rfpId}?tab=qa`)} className={cn("flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm", !activeVendorId ? "bg-navy text-navy-foreground" : "hover:bg-muted")}>
                <span className="flex items-center gap-2"><Megaphone className="size-3.5" />Broadcasts to all</span>
              </button>
            </li>
            {parties.map((p) => (
              <li key={p.vendorId}>
                <button type="button" onClick={() => router.push(`/buyer/rfps/${rfpId}?tab=qa&vendor=${p.vendorId}`)} className={cn("flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm", activeVendorId === p.vendorId ? "bg-navy text-navy-foreground" : "hover:bg-muted")}>
                  <span className="truncate">{p.vendorName}</span>
                  {p.unread ? <span className="rounded-full bg-brand-blue px-1.5 text-[11px] font-semibold text-white">{p.unread}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div className="lg:col-span-2">
        <MessageThread
          threadType="rfp"
          threadId={rfpId}
          messages={messages}
          role="buyer"
          vendorId={activeVendorId}
          title={active ? `Q&A with ${active.vendorName}` : "Broadcast to all invited suppliers"}
          description={active ? "Private to this supplier. Tick broadcast to answer everyone at once." : "Everything posted here is visible to every invited supplier."}
          allowBroadcast
          emptyText={active ? "No questions from this supplier yet." : "No broadcasts yet."}
        />
      </div>
    </div>
  )
}
