"use client"

import Link from "next/link"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronRight, ShieldCheck } from "lucide-react"

import type { DirectoryVendor } from "@/lib/directory/shared"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatGallons(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
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
  columnHelper.accessor("states", {
    header: "States",
    enableSorting: false,
    cell: (info) => {
      const s = info.getValue()
      return s.slice(0, 3).join(", ") + (s.length > 3 ? ` +${s.length - 3}` : "")
    },
  }),
  columnHelper.accessor("products", {
    header: "Products",
    enableSorting: false,
    cell: (info) => info.getValue().slice(0, 3).join(", "),
  }),
  columnHelper.accessor("annualGallons", {
    header: "Annual gal.",
    cell: (info) => formatGallons(info.getValue()),
  }),
  columnHelper.accessor("specialCertification", {
    header: "Certification",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.display({
    id: "action",
    header: "",
    cell: (info) => (
      <Link
        href={`/buyer/directory/${info.row.original.id}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
      >
        View
        <ChevronRight className="size-3.5" />
      </Link>
    ),
  }),
]

export function DirectoryListTable({ data }: { data: DirectoryVendor[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
              {hg.headers.map((header) => (
                <TableHead key={header.id} className="text-xs uppercase tracking-wide">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
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
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No suppliers match your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
