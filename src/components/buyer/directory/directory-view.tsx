"use client"

import { useMemo, useState } from "react"
import { Grid3x3, List, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DEFAULT_DIRECTORY_FILTERS,
  DIRECTORY_TOTAL_VERIFIED,
  filterDirectory,
  type DirectoryFilters,
  type DirectorySort,
  type DirectoryVendor,
} from "@/lib/directory/shared"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DirectoryFiltersPanel } from "./directory-filters"
import { VendorCard } from "./vendor-card"
import { DirectoryListTable } from "./directory-list-table"

const GRID_PAGE = 24
const LIST_PAGE = 50

const SORT_OPTIONS: { value: DirectorySort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "volume", label: "Largest annual volume" },
  { value: "verified", label: "Most recently verified" },
  { value: "az", label: "A–Z" },
]

export function DirectoryView({ vendors }: { vendors: DirectoryVendor[] }) {
  const [filters, setFilters] = useState<DirectoryFilters>(DEFAULT_DIRECTORY_FILTERS)
  const [view, setView] = useState<"grid" | "list">("grid")
  const [page, setPage] = useState(1)

  const filtered = useMemo(
    () => filterDirectory(vendors, filters),
    [vendors, filters]
  )

  const pageSize = view === "grid" ? GRID_PAGE : LIST_PAGE
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function updateFilters(next: DirectoryFilters) {
    setFilters(next)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:p-8">
      <DirectoryFiltersPanel filters={filters} onChange={updateFilters} />

      <div className="min-w-0 flex-1">
        <div className="mb-4 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3">
          <p className="flex items-start gap-2 text-sm text-navy">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-blue" />
            <span>
              <span className="font-medium">Try searching:</span> &ldquo;verified diesel
              suppliers in Minnesota with wet-hose capability and DBE certification.&rdquo;
            </span>
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-navy">{filtered.length}</span> of{" "}
            <span className="font-semibold text-navy">{DIRECTORY_TOTAL_VERIFIED}</span>{" "}
            verified suppliers
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.sort}
              onValueChange={(v) =>
                updateFilters({ ...filters, sort: (v ?? "relevance") as DirectorySort })
              }
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => {
                  setView("grid")
                  setPage(1)
                }}
                className={cn(
                  "rounded-md p-2 transition-colors",
                  view === "grid"
                    ? "bg-navy text-navy-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Grid view"
              >
                <Grid3x3 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("list")
                  setPage(1)
                }}
                className={cn(
                  "rounded-md p-2 transition-colors",
                  view === "list"
                    ? "bg-navy text-navy-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="List view"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paged.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        ) : (
          <DirectoryListTable data={paged} />
        )}

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <p className="font-medium text-navy">No suppliers match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try clearing filters or broadening your search.
            </p>
          </div>
        ) : null}

        {filtered.length > pageSize ? (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="px-2 text-sm text-muted-foreground">
              Page {safePage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
