"use client"

import { useRouter } from "next/navigation"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Eye, MoreHorizontal } from "lucide-react"

import type { BuyerRfpListItem } from "@/lib/rfp/types"
import { RfpStatusBadge } from "@/components/buyer/rfp-status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const columnHelper = createColumnHelper<BuyerRfpListItem>()

const columns = [
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => (
      <span className="font-medium text-navy">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("fuelType", { header: "Fuel Type" }),
  columnHelper.accessor("quantityGallons", {
    header: "Quantity",
    cell: (info) => `${info.getValue().toLocaleString()} gal`,
  }),
  columnHelper.accessor("deliveryStates", {
    header: "States",
    cell: (info) => {
      const s = info.getValue()
      if (!s.length) return "—"
      const shown = s.slice(0, 2).join(", ")
      return (
        <span className="text-muted-foreground">
          {shown}
          {s.length > 2 ? ` +${s.length - 2}` : ""}
        </span>
      )
    },
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <RfpStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor("invitedCount", { header: "Invited" }),
  columnHelper.accessor("responseCount", { header: "Responses" }),
  columnHelper.accessor("bidDueDate", {
    header: "Due Date",
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              window.location.href = `/buyer/rfps/${row.original.id}`
            }}
          >
            <Eye className="size-4" />
            View details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }),
]

export function BuyerRfpsTable({ data }: { data: BuyerRfpListItem[] }) {
  const router = useRouter()
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
              {hg.headers.map((h) => (
                <TableHead key={h.id} className="text-xs uppercase tracking-wide">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No RFPs yet. Create your first procurement request.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => router.push(`/buyer/rfps/${row.original.id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
