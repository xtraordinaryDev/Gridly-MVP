import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import type { ExpenseCategory, ExpenseFrequency } from "@/lib/expenses/math"

export type Expense = {
  id: string
  name: string
  vendor: string | null
  category: ExpenseCategory
  amountCents: number
  frequency: ExpenseFrequency
  startsOn: string
  endsOn: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ExpenseInput = Omit<Expense, "id" | "createdAt" | "updatedAt">

const s = (v: unknown) => (typeof v === "string" ? v : null)

function rowToExpense(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string,
    name: r.name as string,
    vendor: s(r.vendor),
    category: r.category as ExpenseCategory,
    amountCents: Number(r.amount_cents ?? 0),
    frequency: r.frequency as ExpenseFrequency,
    startsOn: r.starts_on as string,
    endsOn: s(r.ends_on),
    notes: s(r.notes),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function toRow(input: ExpenseInput) {
  return {
    name: input.name,
    vendor: input.vendor,
    category: input.category,
    amount_cents: input.amountCents,
    frequency: input.frequency,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    notes: input.notes,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  }
}

export async function listExpenses(): Promise<Expense[]> {
  if (!isSupabaseConfigured()) return []
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("admin_expenses")
    .select("id, name, vendor, category, amount_cents, frequency, starts_on, ends_on, notes, is_active, created_at, updated_at")
    .order("is_active", { ascending: false })
    .order("category", { ascending: true })
    .order("name", { ascending: true })
  if (error) {
    console.error("[expenses] list:", error.message)
    return []
  }
  return (data ?? []).map(rowToExpense)
}

export async function createExpense(input: ExpenseInput, createdBy: string | null): Promise<Expense> {
  if (!isSupabaseConfigured()) throw new Error("Database not configured.")
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("admin_expenses")
    .insert({ ...toRow(input), created_by: createdBy && /^[0-9a-f-]{36}$/i.test(createdBy) ? createdBy : null })
    .select("id, name, vendor, category, amount_cents, frequency, starts_on, ends_on, notes, is_active, created_at, updated_at")
    .single()
  if (error || !data) throw new Error(error?.message ?? "Insert failed")
  return rowToExpense(data)
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<void> {
  if (!isSupabaseConfigured()) return
  const admin = createAdminClient()
  const { error } = await admin.from("admin_expenses").update(toRow(input)).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function setExpenseActive(id: string, isActive: boolean): Promise<void> {
  if (!isSupabaseConfigured()) return
  const admin = createAdminClient()
  const { error } = await admin
    .from("admin_expenses")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteExpense(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const admin = createAdminClient()
  const { error } = await admin.from("admin_expenses").delete().eq("id", id)
  if (error) throw new Error(error.message)
}
