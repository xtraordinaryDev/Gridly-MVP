"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function SiteMobileMenu({ links }: { links: { label: string; href: string }[] }) {
  // Every link closes the sheet on click, so no pathname effect is needed.
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex size-10 items-center justify-center rounded-lg text-navy transition-colors hover:bg-muted md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(20rem,85vw)] gap-0 p-0 sm:max-w-none">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>
        <nav className="flex flex-col gap-1 p-4 pt-14">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-navy hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t p-4">
          <Link href="/login" onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
            Log In
          </Link>
          <Link href="/become-a-supplier" onClick={() => setOpen(false)} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Become a Supplier
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
