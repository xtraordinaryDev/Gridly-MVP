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
import { ArrowUpDown, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import type {
  ApplicationListItem,
  ApplicationStatus,
} from "@/lib/data/applications"
import { buttonVariants } from "@/components/ui/button"
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
import { StatusBadge, SourceBadge } from "@/components/admin/status-badge"

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "info_requested", label: "Info Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>
  const shown = items.slice(0, 2)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((item) => (
        <span
          key={item}
          className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
        >
          {item}
        </span>
      ))}
      {items.length > 2 ? (
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          +{items.length - 2}
        </span>
      ) : null}
    </div>
  )
}

const columnHelper = createColumnHelper<ApplicationListItem>()

const columns = [
  columnHelper.accessor("companyName", {
    header: "Company",
    cell: (info) => (
      <span className="font-medium text-navy">{info.getValue()}</span>
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
  columnHelper.accessor("source", {
    header: "Source",
    enableSorting: false,
    cell: (info) => <SourceBadge source={info.getValue()} />,
  }),
  columnHelper.accessor("products", {
    header: "Products",
    enableSorting: false,
    cell: (info) => <TagList items={info.getValue()} />,
  }),
  columnHelper.accessor("states", {
    header: "States",
    enableSorting: false,
    cell: (info) => <TagList items={info.getValue()} />,
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
        href={`/admin/applications/${info.row.original.id}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
      >
        View
        <ChevronRight className="size-3.5" />
      </Link>
    ),
  }),
]

export function ApplicationsTable({
  data,
  initialStatus = "all",
}: {
  data: ApplicationListItem[]
  initialStatus?: string
}) {
  const [status, setStatus] = useState<string>(
    STATUS_FILTERS.some((f) => f.value === initialStatus)
      ? initialStatus
      : "all"
  )
  const [sorting, setSorting] = useState<SortingState>([
    { id: "submittedAt", desc: true },
  ])

  const filtered = useMemo(
    () =>
      status === "all"
        ? data
        : data.filter((d) => d.status === (status as ApplicationStatus)),
    [data, status]
  )

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
          {filtered.length} application{filtered.length === 1 ? "" : "s"}
        </p>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by status" />
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

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  return (
                    <TableHead key={header.id} className="text-xs uppercase tracking-wide">
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
                    <TableCell key={cell.id}>
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
                  No applications found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
