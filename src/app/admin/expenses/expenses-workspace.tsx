"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Pencil, Plus, Receipt, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Expense } from "@/lib/data/expenses"
import type { AiSpendSummary } from "@/lib/data/ai-usage"
import {
  CATEGORY_LABEL,
  EXPENSE_CATEGORIES,
  EXPENSE_FREQUENCIES,
  FREQUENCY_LABEL,
  formatCharge,
  formatMoney,
  monthlyCents,
  type ExpenseCategory,
  type ExpenseFrequency,
} from "@/lib/expenses/math"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { createExpenseAction, deleteExpenseAction, setExpenseActiveAction, updateExpenseAction, type ExpenseFormValues } from "./actions"

const CATEGORY_ITEMS = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))
const FREQUENCY_ITEMS = EXPENSE_FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABEL[f] }))
const CATEGORY_FILTER_ITEMS = [{ value: "all", label: "All categories" }, ...CATEGORY_ITEMS]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(): ExpenseFormValues {
  return { name: "", vendor: "", category: "software", amount: "", frequency: "monthly", startsOn: today(), endsOn: "", notes: "", isActive: true }
}

function toForm(e: Expense): ExpenseFormValues {
  return {
    name: e.name,
    vendor: e.vendor ?? "",
    category: e.category,
    amount: (e.amountCents / 100).toFixed(2).replace(/\.00$/, ""),
    frequency: e.frequency,
    startsOn: e.startsOn,
    endsOn: e.endsOn ?? "",
    notes: e.notes ?? "",
    isActive: e.isActive,
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

const FEATURE_LABEL: Record<string, string> = {
  rfp_draft: "Draft with AI",
  supplier_match: "Supplier Match",
  bid_brief: "Bid Brief",
}

function formatMicro(micro: number): string {
  const dollars = micro / 1_000_000
  if (dollars > 0 && dollars < 0.01) return "<$0.01"
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function AiSpendCard({ ai, costReportConfigured }: { ai: AiSpendSummary; costReportConfigured: boolean }) {
  const metered = ai.thisMonth.costMicro
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-navy">AI token spend</CardTitle>
            <CardDescription>
              Every GridLink AI call is metered as it happens{ai.model ? ` (${ai.model})` : ""}, priced at Anthropic&rsquo;s list rates. {ai.monthLabel}.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">Live, not an estimate</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="This month, metered" value={formatMicro(metered)} hint={`${ai.thisMonth.calls} call${ai.thisMonth.calls === 1 ? "" : "s"}`} />
          <Stat label="Tokens this month" value={`${formatTokens(ai.thisMonth.inputTokens + ai.thisMonth.outputTokens)}`} hint={`${formatTokens(ai.thisMonth.inputTokens)} in · ${formatTokens(ai.thisMonth.outputTokens)} out`} />
          <Stat label="Last month" value={formatMicro(ai.lastMonth.costMicro)} hint={`${ai.lastMonth.calls} call${ai.lastMonth.calls === 1 ? "" : "s"}`} />
          <Stat
            label="Billed by Anthropic"
            value={ai.billed ? formatMicro(ai.billed.thisMonthMicro) : "—"}
            hint={ai.billed ? `official cost report, month to date` : costReportConfigured ? "waiting for the first nightly sync" : "set ANTHROPIC_ADMIN_KEY to pull the invoice"}
          />
        </div>

        {ai.byFeature.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wide">Feature</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Calls</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Tokens in</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Tokens out</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Cost</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Per call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ai.byFeature.map((f) => (
                  <TableRow key={f.feature}>
                    <TableCell className="font-medium text-navy">{FEATURE_LABEL[f.feature] ?? f.feature}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.calls}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatTokens(f.inputTokens)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatTokens(f.outputTokens)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-navy">{formatMicro(f.costMicro)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatMicro(Math.round(f.costMicro / Math.max(1, f.calls)))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No AI calls recorded yet this month. Usage appears here the moment a buyer drafts an RFP, ranks suppliers or opens a bid brief.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function ExpensesWorkspace({
  expenses,
  preview,
  ai,
  costReportConfigured,
}: {
  expenses: Expense[]
  preview: boolean
  ai: AiSpendSummary
  costReportConfigured: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Expense | "new" | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showInactive, setShowInactive] = useState(false)
  const [isMutating, startMutate] = useTransition()

  const active = expenses.filter((e) => e.isActive)
  const monthly = active.reduce((sum, e) => sum + monthlyCents(e.amountCents, e.frequency), 0)
  const year = new Date().getFullYear()
  const oneTimeThisYear = active
    .filter((e) => e.frequency === "one_time" && e.startsOn.startsWith(String(year)))
    .reduce((sum, e) => sum + e.amountCents, 0)

  const totals = new Map<ExpenseCategory, number>()
  for (const e of active) totals.set(e.category, (totals.get(e.category) ?? 0) + monthlyCents(e.amountCents, e.frequency))
  const byCategory = [...totals.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

  const shown = expenses.filter((e) => (showInactive || e.isActive) && (categoryFilter === "all" || e.category === categoryFilter))

  function toggleActive(e: Expense) {
    startMutate(async () => {
      const res = await setExpenseActiveAction(e.id, !e.isActive)
      if (!res.ok) toast.error(res.message)
      else router.refresh()
    })
  }

  function remove() {
    const target = pendingDelete
    if (!target) return
    startMutate(async () => {
      const res = await deleteExpenseAction(target.id)
      setPendingDelete(null)
      if (!res.ok) toast.error(res.message)
      else {
        toast.success(`${target.name} removed.`)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Monthly run-rate" value={formatMoney(monthly)} hint={`${active.filter((e) => e.frequency !== "one_time").length} recurring item${active.filter((e) => e.frequency !== "one_time").length === 1 ? "" : "s"}`} />
        <Stat label="Annual run-rate" value={formatMoney(monthly * 12)} hint="recurring × 12" />
        <Stat label={`One-time in ${year}`} value={formatMoney(oneTimeThisYear)} hint="charged once" />
        <Stat label="Active items" value={String(active.length)} hint={`${expenses.length - active.length} paused`} />
      </div>

      <AiSpendCard ai={ai} costReportConfigured={costReportConfigured} />

      {byCategory.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy">Monthly by category</CardTitle>
            <CardDescription>Recurring charges normalized to a month. One-time items are not included.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {byCategory.map(([cat, cents]) => (
                <li key={cat} className="grid grid-cols-[minmax(0,160px)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{CATEGORY_LABEL[cat]}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-brand-blue" style={{ width: `${Math.max(2, Math.round((cents / monthly) * 100))}%` }} />
                  </span>
                  <span className="font-medium tabular-nums text-navy">{formatMoney(cents)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base text-navy">Expense ledger</CardTitle>
              <CardDescription>{shown.length} of {expenses.length} shown</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")} items={CATEGORY_FILTER_ITEMS}>
                <SelectTrigger className="w-44" aria-label="Category filter"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORY_FILTER_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(Boolean(v))} /> Show paused
              </label>
              <Button type="button" className="gap-2" onClick={() => setEditing("new")}>
                <Plus className="size-4" /> Add expense
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wide">Expense</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Category</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Charge</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Per month</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Since</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="sticky right-0 bg-muted/50"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Receipt className="mx-auto mb-2 size-6 opacity-50" />
                      {expenses.length === 0 ? "No expenses yet. Add the first one, for example Vercel, Supabase or Resend." : "Nothing matches these filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  shown.map((e) => (
                    <TableRow key={e.id} className={cn(!e.isActive && "opacity-60")}>
                      <TableCell className="max-w-[280px]">
                        <span className="block truncate font-medium text-navy">{e.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{e.vendor ?? ""}{e.vendor && e.notes ? " · " : ""}{e.notes ?? ""}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{CATEGORY_LABEL[e.category]}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCharge(e.amountCents, e.frequency)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums font-medium text-navy">{e.frequency === "one_time" ? "—" : formatMoney(monthlyCents(e.amountCents, e.frequency))}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(e.startsOn)}{e.endsOn ? ` → ${formatDate(e.endsOn)}` : ""}</TableCell>
                      <TableCell>
                        <button type="button" onClick={() => toggleActive(e)} disabled={isMutating} className="cursor-pointer" aria-label={e.isActive ? "Pause this expense" : "Resume this expense"}>
                          <Badge className={e.isActive ? "bg-emerald/15 text-emerald" : "bg-muted text-muted-foreground"}>{e.isActive ? "Active" : "Paused"}</Badge>
                        </button>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-card text-right">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon-xs" aria-label={`Edit ${e.name}`} onClick={() => setEditing(e)}>
                            <Pencil className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-xs" aria-label={`Delete ${e.name}`} disabled={isMutating} onClick={() => setPendingDelete(e)}>
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ExpenseDialog
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        open={editing !== null}
        expense={editing === "new" ? null : editing}
        preview={preview}
        onClose={() => setEditing(null)}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => { if (!o) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It is removed from the ledger and the totals. If it just stopped being charged, pause it instead so the history stays.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isMutating} onClick={(e) => { e.preventDefault(); remove() }} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-navy">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function ExpenseDialog({ open, expense, preview, onClose }: { open: boolean; expense: Expense | null; preview: boolean; onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState<ExpenseFormValues>(() => (expense ? toForm(expense) : emptyForm()))
  const [isPending, startTransition] = useTransition()
  const set = <K extends keyof ExpenseFormValues>(k: K, v: ExpenseFormValues[K]) => setForm((f) => ({ ...f, [k]: v }))

  function save() {
    startTransition(async () => {
      const res = expense ? await updateExpenseAction(expense.id, form) : await createExpenseAction(form)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(preview ? "Saved (preview)." : expense ? "Expense updated." : "Expense added.")
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-navy">{expense ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>Enter the amount as billed and how often it is charged. Monthly equivalents are worked out for you.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => { e.preventDefault(); save() }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exp-name">Name</Label>
              <Input id="exp-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="Vercel Pro" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-vendor">Vendor <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="exp-vendor" value={form.vendor ?? ""} onChange={(e) => set("vendor", e.target.value)} maxLength={120} placeholder="Vercel Inc." />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => v && set("category", v as ExpenseCategory)} items={CATEGORY_ITEMS}>
                <SelectTrigger className="w-full" aria-label="Category"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORY_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount (USD)</Label>
              <Input id="exp-amount" inputMode="decimal" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="20.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Charged</Label>
              <Select value={form.frequency} onValueChange={(v) => v && set("frequency", v as ExpenseFrequency)} items={FREQUENCY_ITEMS}>
                <SelectTrigger className="w-full" aria-label="Frequency"><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCY_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-start">{form.frequency === "one_time" ? "Charged on" : "First charge"}</Label>
              <Input id="exp-start" type="date" value={form.startsOn} onChange={(e) => set("startsOn", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-end">Ends <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="exp-end" type="date" value={form.endsOn ?? ""} onChange={(e) => set("endsOn", e.target.value)} disabled={form.frequency === "one_time"} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exp-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="exp-notes" rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} maxLength={2000} placeholder="Plan name, seats, who holds the login…" />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox checked={form.isActive ?? true} onCheckedChange={(v) => set("isActive", Boolean(v))} /> Currently being charged
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending || !form.name.trim() || !form.amount.trim()} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {expense ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
