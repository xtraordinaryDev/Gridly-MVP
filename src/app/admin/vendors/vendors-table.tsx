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
import { ArrowUpDown, ChevronRight, Search, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import type { DirectoryVendor } from "@/lib/directory/shared"
import { SPECIAL_CERTIFICATIONS } from "@/lib/schemas/vendor-application"
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

const CERT_FILTERS = SPECIAL_CERTIFICATIONS.filter((c) => c !== "None")

function formatGallons(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const columnHelper = createColumnHelper<DirectoryVendor>()

const columns = [
  columnHelper.accessor("companyName", {
    header: "Company",
    cell: (info) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-navy">{info.getValue()}</span>
        <ShieldCheck className="size-3.5 shrink-0 text-emerald" />
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
        <span className="whitespace-nowrap text-muted-foreground">
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
      <span className="text-muted-foreground">{info.getValue().join(", ")}</span>
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
        href={`/buyer/directory/${info.row.original.id}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
      >
        Profile
        <ChevronRight className="size-3.5" />
      </Link>
    ),
  }),
]

export function VendorsTable({ data }: { data: DirectoryVendor[] }) {
  const [search, setSearch] = useState("")
  const [cert, setCert] = useState("all")
  const [sorting, setSorting] = useState<SortingState>([
    { id: "companyName", desc: false },
  ])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((v) => {
      if (cert !== "all" && v.specialCertification !== cert) return false
      if (q && !v.companyName.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, search, cert])

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
              placeholder="Search vendors…"
              className="w-56 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={cert} onValueChange={(v) => setCert(v ?? "all")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Certification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All certifications</SelectItem>
              {CERT_FILTERS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
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
