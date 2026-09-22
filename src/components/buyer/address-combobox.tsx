"use client"

import { useMemo, useState } from "react"
import { Building2, ChevronsUpDown, History, MapPin, PlusCircle } from "lucide-react"

import type { AddressOptions } from "@/lib/data/sites"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

/**
 * Address picker for the RFP wizard: saved sites and previously used addresses
 * in a searchable dropdown, plus "use what I typed" for a brand-new address.
 */
export function AddressCombobox({
  value,
  onChange,
  options,
  placeholder = "Select a site or type an address",
  className,
}: {
  value: string
  onChange: (address: string, state?: string | null) => void
  options: AddressOptions
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const q = query.trim().toLowerCase()
  const sites = useMemo(
    () => options.sites.filter((s) => !q || `${s.name} ${s.address}`.toLowerCase().includes(q)),
    [options.sites, q]
  )
  const previous = useMemo(
    () => options.previous.filter((a) => !q || a.toLowerCase().includes(q)),
    [options.previous, q]
  )
  // Offer "use what I typed" when nothing matches, or when the text looks like a
  // street address (has a number) rather than a partial site-name search.
  const typedIsNew =
    q.length > 3 &&
    !options.sites.some((s) => s.address.toLowerCase() === q) &&
    !options.previous.some((a) => a.toLowerCase() === q) &&
    ((sites.length === 0 && previous.length === 0) || /\d/.test(q))

  const selectedSite = options.sites.find((s) => s.address === value)

  function pick(address: string, state?: string | null) {
    onChange(address, state)
    setQuery("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          !value && "text-muted-foreground",
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {selectedSite ? (
              <>
                <span className="font-medium text-foreground">{selectedSite.name}</span>
                <span className="text-muted-foreground"> · {selectedSite.address}</span>
              </>
            ) : (
              value || placeholder
            )}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--anchor-width)] min-w-[22rem] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search sites or type a new address…"
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter" && typedIsNew) {
                e.preventDefault()
                pick(query.trim())
              }
            }}
          />
          <CommandList>
            {!sites.length && !previous.length && !typedIsNew ? (
              <CommandEmpty>No matches. Keep typing to add a new address.</CommandEmpty>
            ) : null}

            {sites.length ? (
              <CommandGroup heading="Saved sites">
                {sites.map((s) => (
                  <CommandItem key={s.id} value={s.id} onSelect={() => pick(s.address, s.state)} data-checked={s.address === value}>
                    <Building2 className="text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{s.address}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {previous.length ? (
              <CommandGroup heading="Previously used">
                {previous.map((a) => (
                  <CommandItem key={a} value={a} onSelect={() => pick(a)} data-checked={a === value}>
                    <History className="text-muted-foreground" />
                    <span className="truncate">{a}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {typedIsNew ? (
              <CommandGroup heading="New address">
                <CommandItem value={`new:${query}`} onSelect={() => pick(query.trim())}>
                  <PlusCircle className="text-brand-blue" />
                  <span className="truncate">Use “{query.trim()}”</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
