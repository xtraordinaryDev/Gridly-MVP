"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdmin } from "@/lib/auth"
import { isUuid } from "@/lib/storage/paths"
import { createExpense, deleteExpense, setExpenseActive, updateExpense, type Expense } from "@/lib/data/expenses"
import { EXPENSE_CATEGORIES, EXPENSE_FREQUENCIES, parseAmountToCents } from "@/lib/expenses/math"

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; message: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/

const ExpenseSchema = z
  .object({
    name: z.string().trim().min(1, "Give the expense a name.").max(120, "Name is too long."),
    vendor: z.string().trim().max(120, "Vendor is too long.").optional().or(z.literal("")),
    category: z.enum(EXPENSE_CATEGORIES, { message: "Pick a category." }),
    amount: z.string().trim().min(1, "Enter an amount."),
    frequency: z.enum(EXPENSE_FREQUENCIES, { message: "Pick how often it is charged." }),
    startsOn: z.string().regex(DATE, "Enter a start date."),
    endsOn: z.string().regex(DATE, "Enter a valid end date.").optional().or(z.literal("")),
    notes: z.string().trim().max(2000, "Notes are too long.").optional().or(z.literal("")),
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (parseAmountToCents(v.amount) === null) ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter a dollar amount like 49 or 1,250.00." })
    if (v.endsOn && v.endsOn < v.startsOn) ctx.addIssue({ code: "custom", path: ["endsOn"], message: "End date is before the start date." })
  })

export type ExpenseFormValues = z.input<typeof ExpenseSchema>

function toInput(v: z.output<typeof ExpenseSchema>) {
  return {
    name: v.name,
    vendor: v.vendor ? v.vendor : null,
    category: v.category,
    amountCents: parseAmountToCents(v.amount) ?? 0,
    frequency: v.frequency,
    startsOn: v.startsOn,
    endsOn: v.endsOn ? v.endsOn : null,
    notes: v.notes ? v.notes : null,
    isActive: v.isActive,
  }
}

export async function createExpenseAction(values: unknown): Promise<ActionResult<Expense>> {
  const { profile } = await requireAdmin()
  const parsed = ExpenseSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." }
  try {
    const row = await createExpense(toInput(parsed.data), profile.id)
    revalidatePath("/admin/expenses")
    return { ok: true, data: row }
  } catch (err) {
    console.error("[expenses] create:", err)
    return { ok: false, message: "Couldn't save the expense." }
  }
}

export async function updateExpenseAction(id: string, values: unknown): Promise<ActionResult> {
  await requireAdmin()
  if (!isUuid(id)) return { ok: false, message: "Expense not found." }
  const parsed = ExpenseSchema.safeParse(values)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." }
  try {
    await updateExpense(id, toInput(parsed.data))
    revalidatePath("/admin/expenses")
    return { ok: true, data: undefined }
  } catch (err) {
    console.error("[expenses] update:", err)
    return { ok: false, message: "Couldn't save the changes." }
  }
}

export async function setExpenseActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin()
  if (!isUuid(id) || typeof isActive !== "boolean") return { ok: false, message: "Invalid request." }
  try {
    await setExpenseActive(id, isActive)
    revalidatePath("/admin/expenses")
    return { ok: true, data: undefined }
  } catch (err) {
    console.error("[expenses] setActive:", err)
    return { ok: false, message: "Couldn't update the expense." }
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  if (!isUuid(id)) return { ok: false, message: "Expense not found." }
  try {
    await deleteExpense(id)
    revalidatePath("/admin/expenses")
    return { ok: true, data: undefined }
  } catch (err) {
    console.error("[expenses] delete:", err)
    return { ok: false, message: "Couldn't delete the expense." }
  }
}
