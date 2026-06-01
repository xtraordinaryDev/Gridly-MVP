"use client"

import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DEFAULT_DIRECTORY_FILTERS,
  DIRECTORY_FILTER_OPTIONS,
  type DirectoryFilters,
  type EmergencyFilter,
} from "@/lib/directory/shared"
import { PRODUCT_CATEGORIES } from "@/lib/schemas/vendor-application"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs transition-colors",
        active
          ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
          : "border-border text-muted-foreground hover:border-brand-blue/40"
      )}
    >
      {label}
    </button>
  )
}

function toggle(arr: string[], value: string) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

function formatGallonsLabel(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export function DirectoryFiltersPanel({
  filters,
  onChange,
}: {
  filters: DirectoryFilters
  onChange: (next: DirectoryFilters) => void
}) {
  function patch(partial: Partial<DirectoryFilters>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <aside className="sticky top-20 flex w-full shrink-0 flex-col gap-4 lg:w-[280px]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search suppliers…"
          className="pl-9"
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Accordion multiple defaultValue={["states", "products", "capabilities"]}>
          <AccordionItem value="states">
            <AccordionTrigger className="px-4">States</AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {DIRECTORY_FILTER_OPTIONS.states.map((state) => (
                  <Chip
                    key={state}
                    label={state}
                    active={filters.states.includes(state)}
                    onClick={() => patch({ states: toggle(filters.states, state) })}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="products">
            <AccordionTrigger className="px-4">Products offered</AccordionTrigger>
            <AccordionContent className="px-4 space-y-3">
              {Object.entries(PRODUCT_CATEGORIES).map(([group, items]) => (
                <div key={group}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group === "Additives & Fluids" ? "Additives" : group}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((product) => (
                      <Chip
                        key={product}
                        label={product}
                        active={filters.products.includes(product)}
                        onClick={() =>
                          patch({ products: toggle(filters.products, product) })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="capabilities">
            <AccordionTrigger className="px-4">Delivery capabilities</AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                {DIRECTORY_FILTER_OPTIONS.capabilities.map((cap) => (
                  <Chip
                    key={cap}
                    label={cap}
                    active={filters.capabilities.includes(cap)}
                    onClick={() =>
                      patch({ capabilities: toggle(filters.capabilities, cap) })
                    }
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="certs">
            <AccordionTrigger className="px-4">Certifications</AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="flex flex-wrap gap-1.5">
                {DIRECTORY_FILTER_OPTIONS.certifications.map((cert) => (
                  <Chip
                    key={cert}
                    label={cert}
                    active={filters.certifications.includes(cert)}
                    onClick={() =>
                      patch({ certifications: toggle(filters.certifications, cert) })
                    }
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="space-y-4 border-t border-border p-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Annual gallons
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatGallonsLabel(filters.gallonsMin)} – {formatGallonsLabel(filters.gallonsMax)} gal
            </p>
            <input
              type="range"
              min={0}
              max={DIRECTORY_FILTER_OPTIONS.gallonsMax}
              step={500_000}
              value={filters.gallonsMax}
              onChange={(e) =>
                patch({ gallonsMax: Number(e.target.value), gallonsMin: 0 })
              }
              className="mt-2 w-full accent-brand-blue"
            />
          </div>

          <div>
            <Label htmlFor="emergency">Emergency response</Label>
            <Select
              value={filters.emergency}
              onValueChange={(v) => patch({ emergency: (v ?? "any") as EmergencyFilter })}
            >
              <SelectTrigger id="emergency" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTORY_FILTER_OPTIONS.emergency.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fleet size (tankwagons + transports)
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input
                inputMode="numeric"
                placeholder="Min"
                value={filters.fleetMin || ""}
                onChange={(e) =>
                  patch({ fleetMin: Number(e.target.value) || 0 })
                }
              />
              <Input
                inputMode="numeric"
                placeholder="Max"
                value={filters.fleetMax === 200 ? "" : filters.fleetMax}
                onChange={(e) =>
                  patch({
                    fleetMax: Number(e.target.value) || DIRECTORY_FILTER_OPTIONS.fleetMax,
                  })
                }
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Nationwide only</span>
            <button
              type="button"
              role="switch"
              aria-checked={filters.nationwideOnly}
              onClick={() => patch({ nationwideOnly: !filters.nationwideOnly })}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                filters.nationwideOnly ? "bg-emerald" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
                  filters.nationwideOnly ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </label>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => onChange({ ...DEFAULT_DIRECTORY_FILTERS })}
      >
        Clear all filters
      </Button>
    </aside>
  )
}
