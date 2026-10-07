"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, Check, ChevronRight, Copy, Search } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import type {
  ApplicationListItem,
  ApplicationStatus,
} from "@/lib/data/applications"
import { Truncate } from "@/components/admin/truncate"
import { Button, buttonVariants } from "@/components/ui/button"
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
import { StatusBadge, SourceBadge } from "@/components/admin/status-badge"

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "awaiting_registration", label: "Awaiting registration" },
  { value: "info_requested", label: "Info Requested" },
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

function CopyRegistrationLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1 text-muted-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
        } catch {
          toast.error("Couldn't copy — open the application to copy the link.")
        }
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy registration link"}
    </Button>
  )
}

const columnHelper = createColumnHelper<ApplicationListItem>()

const buildColumns = (registrationBase: string) => [
  columnHelper.accessor("companyName", {
    header: "Company",
    cell: (info) => (
      <div className="min-w-0">
        <Truncate className="font-medium text-navy">{info.getValue()}</Truncate>
        {info.row.original.contactEmail ? (
          <Truncate className="text-xs text-muted-foreground">{info.row.original.contactEmail}</Truncate>
        ) : null}
      </div>
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
    cell: (info) => (
      <StatusBadge
        status={info.getValue()}
        awaitingRegistration={info.row.original.awaitingRegistration}
        className="whitespace-nowrap"
      />
    ),
  }),
  columnHelper.display({
    id: "action",
    header: "",
    cell: (info) => (
      <div className="flex items-center justify-end gap-1">
        {info.row.original.awaitingRegistration ? (
          <CopyRegistrationLink url={`${registrationBase}/${info.row.original.invitationToken}`} />
        ) : null}
        <Link
          href={`/admin/applications/${info.row.original.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
        >
          View
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    ),
  }),
]

export function ApplicationsTable({
  data,
  initialStatus = "all",
  registrationBase,
}: {
  data: ApplicationListItem[]
  initialStatus?: string
  /** `${site}/vendor-registration` — the token is appended for "Copy registration link". */
  registrationBase: string
}) {
  const [status, setStatus] = useState<string>(
    STATUS_FILTERS.some((f) => f.value === initialStatus)
      ? initialStatus
      : "all"
  )
  const [search, setSearch] = useState("")
  const [sorting, setSorting] = useState<SortingState>([
    { id: "submittedAt", desc: true },
  ])
  const columns = useMemo(() => buildColumns(registrationBase), [registrationBase])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((d) => {
      // "Pending Review" means reviewable: invites and interest forms still owed a registration have their own filter.
      if (status === "awaiting_registration" ? !d.awaitingRegistration : status !== "all" && (d.status !== (status as ApplicationStatus) || d.awaitingRegistration)) return false
      if (q) {
        const haystack = [d.companyName, d.contactEmail ?? "", ...d.states, ...d.products].join(" ").toLowerCase()
        if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false
      }
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
          {filtered.length} application{filtered.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search company, email, state, product…"
              aria-label="Search applications"
              className="w-72 max-w-full pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")} items={STATUS_FILTERS}>
            <SelectTrigger className="w-52" aria-label="Filter by status">
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
