"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronRight, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import type { BuyerApplicationListItem } from "@/lib/data/buyer-applications"
import type { ApplicationStatus } from "@/lib/data/applications"
import { Truncate } from "@/components/admin/truncate"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/admin/status-badge"

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const columnHelper = createColumnHelper<BuyerApplicationListItem>()

const columns = [
  columnHelper.accessor("companyName", {
    header: "Organization",
    cell: (info) => <Truncate className="font-medium text-navy">{info.getValue()}</Truncate>,
  }),
  columnHelper.accessor("fullName", {
    header: "Contact",
    enableSorting: false,
    cell: (info) => <Truncate className="max-w-[11rem] text-foreground">{info.getValue()}</Truncate>,
  }),
  columnHelper.accessor("email", {
    header: "Email",
    enableSorting: false,
    cell: (info) => (
      <Truncate className="max-w-[11rem] text-muted-foreground">{info.getValue()}</Truncate>
    ),
  }),
  columnHelper.accessor("industry", {
    header: "Industry",
    enableSorting: false,
    cell: (info) => (
      <Truncate className="max-w-[11rem] text-muted-foreground">{info.getValue()}</Truncate>
    ),
  }),
  columnHelper.accessor("submittedAt", {
    header: "Submitted",
    cell: (info) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatDate(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    enableSorting: false,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: "action",
    header: "",
    cell: (info) => (
      <Link
        href={`/admin/buyers/${info.row.original.id}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
      >
        View
        <ChevronRight className="size-3.5" />
      </Link>
    ),
  }),
]

export function BuyersTable({
  data,
  initialStatus = "all",
}: {
  data: BuyerApplicationListItem[]
  initialStatus?: string
}) {
  const [status, setStatus] = useState<string>(
    STATUS_FILTERS.some((f) => f.value === initialStatus) ? initialStatus : "all"
  )
  const [search, setSearch] = useState("")
  const [sorting, setSorting] = useState<SortingState>([
    { id: "submittedAt", desc: true },
  ])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((d) => {
      if (status !== "all" && d.status !== (status as ApplicationStatus)) return false
      if (q && !`${d.companyName} ${d.fullName} ${d.email} ${d.industry ?? ""}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, status, search])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} request{filtered.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search organization, contact, email…"
              aria-label="Search buyer requests"
              className="w-72 max-w-full pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")} items={STATUS_FILTERS}>
            <SelectTrigger className="w-44" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  return (
                    <TableHead key={header.id} className={cn("text-xs uppercase tracking-wide", header.column.id === "action" && "sticky right-0 bg-muted")}>
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-navy"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <ArrowUpDown className="size-3" />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.id === "action" ? "sticky right-0 bg-card text-right" : undefined}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No buyer requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
