"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  Eye,
  FileUp,
  Loader2,
  Mail,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { UpdateContact, UpdateSend, UpdateSendRecipient } from "@/lib/data/updates"
import {
  CONTACT_STATUSES,
  CONTACT_TYPES,
  ensureHtml,
  findPlaceholderBrackets,
  titleFromHtml,
  type ContactStatus,
  type ContactType,
} from "@/lib/updates/html"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  addContactsAction,
  deleteContactAction,
  sendDetailAction,
  sendTestAction,
  sendUpdateAction,
  updateContactAction,
} from "./actions"

/* ----------------------------------------------------------------- labels */

const TYPE_LABEL: Record<ContactType, string> = {
  investor: "Investor",
  mentor: "Mentor",
  buyer: "Buyer",
  supplier: "Supplier",
  prospect: "Prospect",
  partner: "Partner",
  other: "Other",
}

const STATUS_LABEL: Record<ContactStatus, string> = {
  active: "Active",
  paused: "Paused",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
}

const STATUS_CLASS: Record<ContactStatus, string> = {
  active: "bg-emerald/15 text-emerald",
  paused: "bg-amber-100 text-amber-700",
  unsubscribed: "bg-muted text-muted-foreground",
  bounced: "bg-destructive/10 text-destructive",
}

const TYPE_ITEMS = CONTACT_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))
const STATUS_ITEMS = CONTACT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))
const TYPE_FILTER_ITEMS = [{ value: "all", label: "All types" }, ...TYPE_ITEMS]
const STATUS_FILTER_ITEMS = [{ value: "all", label: "All statuses" }, ...STATUS_ITEMS]

const SEND_STATUS_CLASS: Record<UpdateSend["status"], string> = {
  sending: "bg-brand-blue/10 text-brand-blue",
  sent: "bg-emerald/15 text-emerald",
  partial: "bg-amber-100 text-amber-700",
  failed: "bg-destructive/10 text-destructive",
}

function formatDateTime(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

function StatusPill({ status }: { status: ContactStatus }) {
  return <Badge className={cn("font-medium", STATUS_CLASS[status])}>{STATUS_LABEL[status]}</Badge>
}

/* -------------------------------------------------------------- workspace */

export function UpdatesWorkspace({
  contacts,
  sends,
  fromAddress,
  emailConfigured,
  preview,
}: {
  contacts: UpdateContact[]
  sends: UpdateSend[]
  fromAddress: string
  emailConfigured: boolean
  preview: boolean
}) {
  const [tab, setTab] = useState("compose")
  const active = contacts.filter((c) => c.status === "active").length

  return (
    <div className="space-y-4">
      {!emailConfigured ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <b>Email sending is not configured.</b> Set <code>RESEND_API_KEY</code> and <code>RESEND_FROM_EMAIL</code>; until
            then, sends are logged on the server instead of delivered.
          </div>
        </div>
      ) : fromAddress.includes("resend.dev") ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <b>Sending from the Resend sandbox address</b> ({fromAddress}). It only delivers to the email on the Resend
            account. Verify gridlink.global in Resend and set <code>RESEND_FROM_EMAIL</code> before a real send.
          </div>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "compose")}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-muted/60 p-1 sm:w-auto">
          <TabsTrigger value="compose" className="gap-1.5"><Send className="size-3.5" /> Compose &amp; send</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="size-3.5" /> Contacts <span className="text-muted-foreground">({contacts.length})</span></TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><Mail className="size-3.5" /> History <span className="text-muted-foreground">({sends.length})</span></TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <ComposeTab contacts={contacts} fromAddress={fromAddress} activeCount={active} preview={preview} onSent={() => setTab("history")} />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ContactsTab contacts={contacts} preview={preview} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab sends={sends} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ---------------------------------------------------------------- compose */

function ComposeTab({
  contacts,
  fromAddress,
  activeCount,
  preview,
  onSent,
}: {
  contacts: UpdateContact[]
  fromAddress: string
  activeCount: number
  preview: boolean
  onSent: () => void
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState("")
  const [html, setHtml] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [testTo, setTestTo] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [allowBrackets, setAllowBrackets] = useState(false)
  const [isSending, startSend] = useTransition()
  const [isTesting, startTest] = useTransition()

  const brackets = useMemo(() => (html ? findPlaceholderBrackets(html) : []), [html])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contacts.filter((c) => {
      if (typeFilter !== "all" && c.contactType !== typeFilter) return false
      if (!q) return true
      return [c.fullName, c.email, c.company].some((v) => v?.toLowerCase().includes(q))
    })
  }, [contacts, typeFilter, query])

  const selectable = shown.filter((c) => c.status === "active")
  const selectedActive = contacts.filter((c) => selected.has(c.id) && c.status === "active")

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }
  function selectShown() {
    setSelected((prev) => new Set([...prev, ...selectable.map((c) => c.id)]))
  }
  function selectAllActive() {
    setSelected(new Set(contacts.filter((c) => c.status === "active").map((c) => c.id)))
  }

  async function loadFile(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    setHtml(text)
    if (!subject) {
      const t = titleFromHtml(text)
      if (t) setSubject(t)
    }
    setShowPreview(true)
  }

  const canSend = subject.trim().length > 0 && html.trim().length > 0
  const bracketsBlock = brackets.length > 0 && !allowBrackets
  const previewHtml = useMemo(() => (html.trim() ? ensureHtml(html) : ""), [html])
  const blocker = !subject.trim()
    ? "Add a subject line."
    : !html.trim()
      ? "Write or paste a message."
      : bracketsBlock
        ? "Fill in the placeholders above, or tick “Send anyway”."
        : selectedActive.length === 0
          ? "Tick at least one recipient."
          : null

  function sendTest() {
    startTest(async () => {
      const res = await sendTestAction({ subject, html, to: testTo })
      if (res.ok) toast.success(preview ? "Test logged (preview)." : `Test sent to ${testTo.trim()}.`)
      else toast.error(res.message)
    })
  }

  function send() {
    startSend(async () => {
      const res = await sendUpdateAction({ subject, html, contactIds: [...selected] })
      setConfirmOpen(false)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      const { sent, failed, skipped } = res.data
      if (failed === 0) toast.success(`Sent to ${sent} contact${sent === 1 ? "" : "s"}.${skipped ? ` ${skipped} skipped (not active).` : ""}`)
      else toast.warning(`Sent ${sent}, failed ${failed}. See History for details.`)
      setSelected(new Set())
      router.refresh()
      onSent()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Message */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base text-navy">Message</CardTitle>
          <CardDescription>
            Paste the email HTML or load a file. Merge fields: <code>{"{{first_name}}"}</code>, <code>{"{{name}}"}</code>,{" "}
            <code>{"{{unsubscribe_url}}"}</code>. From: <span className="text-foreground">{fromAddress}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="GridLink Update #1: Our first supplier is in the system" />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="html">Message (HTML or plain text)</Label>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept=".html,.htm,text/html" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <FileUp className="size-3.5" /> Load .html file
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={!html} onClick={() => setShowPreview((v) => !v)}>
                  <Eye className="size-3.5" /> {showPreview ? "Hide preview" : "Preview"}
                </Button>
              </div>
            </div>
            <Textarea id="html" value={html} onChange={(e) => setHtml(e.target.value)} rows={showPreview ? 6 : 14} spellCheck={false} className="font-mono text-xs" placeholder="Paste the newsletter HTML, or just type a short note — plain text is wrapped in a simple GridLink layout for you." />
          </div>

          {showPreview && html ? (
            <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
              <iframe title="Email preview" sandbox="" srcDoc={previewHtml} className="h-[620px] w-full bg-white" />
            </div>
          ) : null}

          {brackets.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" /> Unfilled placeholders</div>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {brackets.map((b) => <li key={b} className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">{b}</li>)}
              </ul>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <Checkbox checked={allowBrackets} onCheckedChange={(v) => setAllowBrackets(Boolean(v))} /> Send anyway
              </label>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="test-to">Send a test copy to</Label>
              <Input id="test-to" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@gridlink.global" />
            </div>
            <Button type="button" variant="outline" disabled={!canSend || !testTo || isTesting} onClick={sendTest}>
              {isTesting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Send test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base text-navy">Recipients</CardTitle>
          <CardDescription>
            {selectedActive.length} selected of {activeCount} active contact{activeCount === 1 ? "" : "s"}. Paused, unsubscribed and bounced contacts can&rsquo;t be selected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="pl-8" />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")} items={TYPE_FILTER_ITEMS}>
              <SelectTrigger className="w-32" aria-label="Type"><SelectValue /></SelectTrigger>
              <SelectContent>{TYPE_FILTER_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Button type="button" variant="ghost" size="xs" onClick={selectShown} disabled={!selectable.length}>Select shown ({selectable.length})</Button>
            <Button type="button" variant="ghost" size="xs" onClick={selectAllActive} disabled={!activeCount}>Select all active</Button>
            <Button type="button" variant="ghost" size="xs" onClick={() => setSelected(new Set())} disabled={!selected.size}>Clear</Button>
          </div>

          <div className="max-h-[480px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {shown.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {contacts.length === 0 ? "No contacts yet. Add some on the Contacts tab." : "No contacts match."}
              </p>
            ) : (
              shown.map((c) => {
                const disabled = c.status !== "active"
                return (
                  <label key={c.id} className={cn("flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm hover:bg-muted/40", disabled && "cursor-not-allowed opacity-60")}>
                    <Checkbox className="mt-0.5" disabled={disabled} checked={selected.has(c.id)} onCheckedChange={(v) => toggle(c.id, Boolean(v))} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-navy">{c.fullName ?? c.email}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.fullName ? c.email : null}{c.fullName && c.company ? " · " : null}{c.company}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-[10px]">{TYPE_LABEL[c.contactType]}</Badge>
                      {disabled ? <StatusPill status={c.status} /> : null}
                    </span>
                  </label>
                )
              })
            )}
          </div>

          <Button type="button" className="w-full gap-2" disabled={blocker !== null || isSending} onClick={() => setConfirmOpen(true)}>
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send to {selectedActive.length} contact{selectedActive.length === 1 ? "" : "s"}
          </Button>
          {blocker ? <p className="text-xs text-muted-foreground">{blocker}</p> : null}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this update?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{subject.trim()}&rdquo; will go to {selectedActive.length} contact{selectedActive.length === 1 ? "" : "s"} from {fromAddress}. Each person gets their own copy with their own unsubscribe link. This can&rsquo;t be recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isSending} onClick={(e) => { e.preventDefault(); send() }}>
              {isSending ? <Loader2 className="size-4 animate-spin" /> : null} Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* --------------------------------------------------------------- contacts */

function ContactsTab({ contacts, preview }: { contacts: UpdateContact[]; preview: boolean }) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [defaultType, setDefaultType] = useState<string>("investor")
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [pendingDelete, setPendingDelete] = useState<UpdateContact | null>(null)
  const [isAdding, startAdd] = useTransition()
  const [isMutating, startMutate] = useTransition()

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contacts.filter((c) => {
      if (typeFilter !== "all" && c.contactType !== typeFilter) return false
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (!q) return true
      return [c.fullName, c.email, c.company].some((v) => v?.toLowerCase().includes(q))
    })
  }, [contacts, query, typeFilter, statusFilter])

  function add() {
    startAdd(async () => {
      const res = await addContactsAction({ text, defaultType })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      const { added, updated, rejected } = res.data
      toast.success(`${added} added, ${updated} updated.${rejected.length ? ` ${rejected.length} line(s) skipped.` : ""}`)
      setText(rejected.join("\n"))
      router.refresh()
    })
  }

  function patch(id: string, input: Omit<Parameters<typeof updateContactAction>[0], "id">) {
    startMutate(async () => {
      const res = await updateContactAction({ ...input, id })
      if (!res.ok) toast.error(res.message)
      else router.refresh()
    })
  }

  function remove() {
    const target = pendingDelete
    if (!target) return
    startMutate(async () => {
      const res = await deleteContactAction(target.id)
      setPendingDelete(null)
      if (!res.ok) toast.error(res.message)
      else {
        toast.success(`${target.email} removed.`)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">Add contacts</CardTitle>
          <CardDescription>
            One per line. Any of: <code>jane@acme.com</code> · <code>Jane Doe &lt;jane@acme.com&gt;</code> ·{" "}
            <code>Jane Doe, jane@acme.com, Acme Fuel, supplier</code>. Existing addresses are updated, never duplicated, and their status is left alone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} spellCheck={false} className="font-mono text-xs" placeholder={"Vinny Pallini <vinny@nduroai.com>, Nduro, mentor\nbruce.nordin@stthomas.edu, Bruce Nordin, St. Thomas, mentor"} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Label className="text-sm text-muted-foreground sm:w-auto">Type for lines that don&rsquo;t say</Label>
            <Select value={defaultType} onValueChange={(v) => setDefaultType(v ?? "other")} items={TYPE_ITEMS}>
              <SelectTrigger className="w-40" aria-label="Default type"><SelectValue /></SelectTrigger>
              <SelectContent>{TYPE_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" className="gap-2 sm:ml-auto" disabled={!text.trim() || isAdding} onClick={add}>
              {isAdding ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />} Add contacts
            </Button>
          </div>
          {preview ? <p className="text-xs text-muted-foreground">Preview mode: contacts aren&rsquo;t saved without a database.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base text-navy">Contact list</CardTitle>
              <CardDescription>{shown.length} of {contacts.length} shown</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-44 pl-8" />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")} items={TYPE_FILTER_ITEMS}>
                <SelectTrigger className="w-32" aria-label="Type filter"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_FILTER_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")} items={STATUS_FILTER_ITEMS}>
                <SelectTrigger className="w-36" aria-label="Status filter"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_FILTER_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wide">Contact</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Company</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Type</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Added</TableHead>
                  <TableHead className="sticky right-0 bg-muted/50"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">{contacts.length === 0 ? "No contacts yet." : "No contacts match."}</TableCell></TableRow>
                ) : (
                  shown.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="max-w-[260px]">
                        <span className="block truncate font-medium text-navy">{c.fullName ?? "—"}</span>
                        <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">{c.company ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={c.contactType} onValueChange={(v) => v && patch(c.id, { contactType: v })} items={TYPE_ITEMS}>
                          <SelectTrigger className="h-8 w-32 text-xs" aria-label="Type"><SelectValue /></SelectTrigger>
                          <SelectContent>{TYPE_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={c.status} onValueChange={(v) => v && patch(c.id, { status: v })} items={STATUS_ITEMS}>
                          <SelectTrigger className={cn("h-8 w-36 text-xs", STATUS_CLASS[c.status])} aria-label="Status"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(c.createdAt).split(",").slice(0, 2).join(",")}</TableCell>
                      <TableCell className="sticky right-0 bg-card text-right">
                        <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${c.email}`} disabled={isMutating} onClick={() => setPendingDelete(c)}>
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => { if (!o) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They&rsquo;ll be deleted from the list. Past sends keep their delivery record. If they asked to stop receiving updates, set their status to Unsubscribed instead so they can&rsquo;t be re-added by mistake.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isMutating} onClick={(e) => { e.preventDefault(); remove() }} className="bg-destructive text-white hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ---------------------------------------------------------------- history */

function HistoryTab({ sends }: { sends: UpdateSend[] }) {
  const [open, setOpen] = useState<UpdateSend | null>(null)
  const [detail, setDetail] = useState<{ html: string; recipients: UpdateSendRecipient[] } | null>(null)
  const [view, setView] = useState<"email" | "recipients">("email")
  const [isLoading, startLoad] = useTransition()
  const recipients = detail?.recipients ?? null

  function show(send: UpdateSend) {
    setOpen(send)
    setDetail(null)
    setView("email")
    startLoad(async () => {
      const res = await sendDetailAction(send.id)
      if (res.ok) setDetail({ html: res.data.html, recipients: res.data.recipients })
      else toast.error(res.message)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-navy">Sent updates</CardTitle>
        <CardDescription>Every update sent from this console, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs uppercase tracking-wide">Sent</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Subject</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">By</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wide">Recipients</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wide">Delivered</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wide">Failed</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead><span className="sr-only">Details</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sends.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nothing sent yet.</TableCell></TableRow>
              ) : (
                sends.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(s.createdAt)}</TableCell>
                    <TableCell className="max-w-[320px] truncate font-medium text-navy">{s.subject}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{s.sentByName ?? "—"}</TableCell>
                    <TableCell className="text-right">{s.recipientCount}</TableCell>
                    <TableCell className="text-right">{s.sentCount}</TableCell>
                    <TableCell className={cn("text-right", s.failedCount > 0 && "font-semibold text-destructive")}>{s.failedCount}</TableCell>
                    <TableCell><Badge className={SEND_STATUS_CLASS[s.status]}>{s.status === "partial" ? "Partly failed" : s.status[0].toUpperCase() + s.status.slice(1)}</Badge></TableCell>
                    <TableCell className="text-right"><Button type="button" variant="outline" size="sm" onClick={() => show(s)}>Details</Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={open !== null} onOpenChange={(o) => { if (!o) setOpen(null) }}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-navy">{open?.subject}</DialogTitle>
            <DialogDescription>
              {open ? `Sent ${formatDateTime(open.createdAt)}${open.sentByName ? ` by ${open.sentByName}` : ""} · ${open.recipientCount} recipient${open.recipientCount === 1 ? "" : "s"} · ${open.sentCount} delivered, ${open.failedCount} failed` : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-1 rounded-lg bg-muted/60 p-1 text-sm">
            <button type="button" onClick={() => setView("email")} className={cn("flex-1 rounded-md px-3 py-1.5 font-medium transition-colors", view === "email" ? "bg-card text-navy shadow-sm" : "text-muted-foreground hover:text-navy")}>Email as sent</button>
            <button type="button" onClick={() => setView("recipients")} className={cn("flex-1 rounded-md px-3 py-1.5 font-medium transition-colors", view === "recipients" ? "bg-card text-navy shadow-sm" : "text-muted-foreground hover:text-navy")}>Recipients ({recipients?.length ?? open?.recipientCount ?? 0})</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading || !detail ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
          ) : view === "email" ? (
            <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
              <iframe title="Email as sent" sandbox="" srcDoc={detail.html} className="h-[62vh] w-full bg-white" />
            </div>
          ) : !recipients || recipients.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No recipients were recorded for this send.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {[...recipients].sort((a, b) => (a.status === "failed" ? -1 : 0) - (b.status === "failed" ? -1 : 0)).map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-navy">{r.fullName ?? r.email}</span>
                    {r.fullName ? <span className="block truncate text-xs text-muted-foreground">{r.email}</span> : null}
                    {r.error ? <span className="block text-xs text-destructive">{r.error}</span> : null}
                  </span>
                  <Badge className={r.status === "sent" ? "bg-emerald/15 text-emerald" : r.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}>
                    {r.status === "sent" ? "Delivered" : r.status === "failed" ? "Failed" : "Queued"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
