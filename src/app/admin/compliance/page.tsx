import Link from "next/link"
import { AlertTriangle, CalendarClock, FileWarning, ShieldCheck } from "lucide-react"

import { requireAdmin } from "@/lib/auth"
import { listComplianceIssues } from "@/lib/data/documents"
import { StatTile } from "@/components/invoicing/charts"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function fmt(d: string | null) {
  return d ? new Date(d.length === 10 ? d + "T12:00:00Z" : d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"
}

export default async function AdminCompliancePage() {
  await requireAdmin()
  const issues = await listComplianceIssues()
  const expired = issues.filter((i) => i.kind === "expired")
  const expiring = issues.filter((i) => i.kind === "expiring")
  const missing = issues.filter((i) => i.kind === "missing")

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Compliance</h1>
        <p className="mt-1 text-muted-foreground">Verified suppliers with expired, expiring, or missing documents. Reminders go out daily from the cron job.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Expired" value={String(expired.length)} icon={AlertTriangle} accent={expired.length ? "text-red-700 bg-red-100" : "text-muted-foreground bg-muted"} />
        <StatTile label="Expiring within 30 days" value={String(expiring.length)} icon={CalendarClock} accent={expiring.length ? "text-amber-700 bg-amber-100" : "text-muted-foreground bg-muted"} />
        <StatTile label="Missing required" value={String(missing.length)} icon={FileWarning} accent={missing.length ? "text-navy bg-navy/10" : "text-muted-foreground bg-muted"} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs uppercase tracking-wide">Supplier</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Document</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Issue</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Expires</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">File</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground"><ShieldCheck className="mx-auto mb-2 size-5 text-emerald" />Every verified supplier is current.</TableCell></TableRow>
            ) : issues.map((i) => (
              <TableRow key={`${i.vendorId}-${i.type}`}>
                <TableCell><Link href={`/admin/vendors`} className="font-medium text-navy hover:underline">{i.vendorName}</Link></TableCell>
                <TableCell>{i.label}</TableCell>
                <TableCell>
                  {i.kind === "expired" ? <Badge className="bg-red-100 text-red-800">Expired</Badge> : i.kind === "expiring" ? <Badge className="bg-amber-100 text-amber-800">Expires in {i.daysLeft}d</Badge> : <Badge className="bg-navy/10 text-navy">Missing</Badge>}
                </TableCell>
                <TableCell className="text-muted-foreground">{fmt(i.expiresAt)}</TableCell>
                <TableCell className="text-muted-foreground">{i.fileName ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
