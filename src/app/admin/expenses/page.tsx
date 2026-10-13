import { requireAdmin } from "@/lib/auth"
import { listExpenses } from "@/lib/data/expenses"
import { getAiSpendSummary } from "@/lib/data/ai-usage"
import { isCostReportConfigured } from "@/lib/ai/cost-report"
import { ExpensesWorkspace } from "./expenses-workspace"

export default async function AdminExpensesPage() {
  const { preview } = await requireAdmin()
  const [expenses, ai] = await Promise.all([listExpenses(), getAiSpendSummary()])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Expenses</h1>
        <p className="mt-1 text-muted-foreground">
          What GridLink pays for, how much, and how often. Run-rate totals update as you add items.
        </p>
      </div>

      <ExpensesWorkspace expenses={expenses} preview={preview} ai={ai} costReportConfigured={isCostReportConfigured()} />
    </div>
  )
}
