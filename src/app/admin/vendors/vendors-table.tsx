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
import { ArrowUpDown, ChevronRight, Search, ShieldCheck, ShieldOff } from "lucide-react"

import { cn } from "@/lib/utils"
import type { AdminVendorListItem } from "@/lib/data/admin-vendors"
import { SPECIAL_CERTIFICATIONS } from "@/lib/schemas/vendor-application"
import { Truncate } from "@/components/admin/truncate"
import { Badge } from "@/components/ui/badge"
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

const CERT_ITEMS = [
  { value: "all", label: "All certifications" },
  ...SPECIAL_CERTIFICATIONS.filter((c) => c !== "None").map((c) => ({ value: c as string, label: c as string })),
]

const STATUS_ITEMS = [
  { value: "all", label: "All vendors" },
  { value: "verified", label: "Verified" },
  { value: "suspended", label: "Suspended" },
]

function formatGallons(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const columnHelper = createColumnHelper<AdminVendorListItem>()

const columns = [
  columnHelper.accessor("companyName", {
    header: "Company",
    cell: (info) => (
      <div className="flex items-center gap-2">
        <Link href={`/admin/vendors/${info.row.original.id}`} className="min-w-0 font-medium text-navy hover:underline">
          <Truncate>{info.getValue()}</Truncate>
        </Link>
        {info.row.original.isVerified ? (
          <ShieldCheck className="size-3.5 shrink-0 text-emerald" aria-label="Verified" />
        ) : (
          <Badge className="shrink-0 gap-1 bg-destructive/10 text-destructive">
            <ShieldOff className="size-3" /> Suspended
          </Badge>
        )}
      </div>
    ),
  }),
  columnHelper.accessor("specialCertification", {
    header: "Certification",
    enableSorting: false,
    cell: (info) =>
      info.getValue() ? (
        <Badge className="bg-brand-blue/10 font-normal text-brand-blue">
          {info.getValue()}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  }),
  columnHelper.accessor("states", {
    header: "States",
    enableSorting: false,
    cell: (info) => {
      const states = info.getValue()
      const shown = states.slice(0, 2).join(", ")
      return (
        <span className="whitespace-nowrap text-muted-foreground" title={states.join(", ")}>
          {shown}
          {states.length > 2 ? ` +${states.length - 2}` : ""}
        </span>
      )
    },
  }),
  columnHelper.accessor("products", {
    header: "Products",
    enableSorting: false,
    cell: (info) => (
      <Truncate className="max-w-[14rem] text-muted-foreground">{info.getValue().join(", ")}</Truncate>
    ),
  }),
  columnHelper.accessor("annualGallons", {
    header: "Annual gal",
    cell: (info) => (
      <span className="whitespace-nowrap text-foreground">
        {formatGallons(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("verifiedAt", {
    header: "Verified",
    cell: (info) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatDate(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: "action",
    header: "",
    cell: (info) => (
      <Link
        href={`/admin/vendors/${info.row.original.id}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
      >
        View
        <ChevronRight className="size-3.5" />
      </Link>
    ),
  }),
]

export function VendorsTable({ data }: { data: AdminVendorListItem[] }) {
  const [search, setSearch] = useState("")
  const [cert, setCert] = useState("all")
  const [status, setStatus] = useState("all")
  const [sorting, setSorting] = useState<SortingState>([
    { id: "companyName", desc: false },
  ])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((v) => {
      if (cert !== "all" && v.specialCertification !== cert) return false
      if (status !== "all" && v.isVerified !== (status === "verified")) return false
      if (q) {
        const haystack = [v.companyName, v.specialCertification, v.nationwide ? "nationwide" : "", ...v.states, ...v.products]
          .join(" ")
          .toLowerCase()
        // Every word must appear somewhere: "texas diesel" finds Texas diesel suppliers.
        if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false
      }
      return true
    })
  }, [data, search, cert, status])

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
          {filtered.length} vendor{filtered.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, state, product…"
              aria-label="Search vendors"
              className="w-64 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")} items={STATUS_ITEMS}>
            <SelectTrigger className="w-40" aria-label="Verification status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ITEMS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cert} onValueChange={(v) => setCert(v ?? "all")} items={CERT_ITEMS}>
            <SelectTrigger className="w-48" aria-label="Certification">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CERT_ITEMS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
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
                  No vendors match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
