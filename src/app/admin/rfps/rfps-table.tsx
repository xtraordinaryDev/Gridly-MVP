"use client"

import { useMemo, useState } from "react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, Search, Zap } from "lucide-react"

import type { AdminRfpListItem } from "@/lib/data/rfps"
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
import { RfpStatusBadge } from "@/components/buyer/rfp-status-badge"

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "closed", label: "Closed" },
  { value: "awarded", label: "Awarded" },
]

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatGallons(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

const columnHelper = createColumnHelper<AdminRfpListItem>()

const columns = [
  columnHelper.accessor("title", {
    header: "RFP",
    cell: (info) => (
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-navy">{info.getValue()}</span>
        {info.row.original.urgency !== "standard" ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
            <Zap className="size-2.5" />
            {info.row.original.urgency}
          </span>
        ) : null}
      </div>
    ),
  }),
  columnHelper.accessor("buyerName", {
    header: "Buyer",
    cell: (info) => <span className="text-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor("fuelType", {
    header: "Fuel",
    enableSorting: false,
    cell: (info) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("quantityGallons", {
    header: "Gallons",
    cell: (info) => (
      <span className="whitespace-nowrap text-foreground">
        {formatGallons(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("deliveryStates", {
    header: "States",
    enableSorting: false,
    cell: (info) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {info.getValue().join(", ")}
      </span>
    ),
  }),
  columnHelper.accessor("invitedCount", {
    header: "Invited",
    cell: (info) => (
      <span className="text-muted-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("responseCount", {
    header: "Bids",
    cell: (info) => (
      <span className="font-medium text-navy">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("bidDueDate", {
    header: "Due",
    cell: (info) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatDate(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    enableSorting: false,
    cell: (info) => <RfpStatusBadge status={info.getValue()} />,
  }),
]

export function AdminRfpsTable({
  data,
  initialStatus = "all",
}: {
  data: AdminRfpListItem[]
  initialStatus?: string
}) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>(
    STATUS_FILTERS.some((f) => f.value === initialStatus) ? initialStatus : "all"
  )
  const [sorting, setSorting] = useState<SortingState>([])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((r) => {
      if (status !== "all" && r.status !== status) return false
      if (q && !`${r.title} ${r.buyerName}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, search, status])

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
          {filtered.length} RFP{filtered.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search RFPs or buyers…"
              className="w-56 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
            <SelectTrigger className="w-44">
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
                  No RFPs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
