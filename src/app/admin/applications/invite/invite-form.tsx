"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Check, Copy, Loader2, Send } from "lucide-react"

import { inviteSupplier } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const InviteSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  contactName: z.string().trim().min(1, "Contact name is required"),
  email: z.email("Enter a valid email address"),
  note: z.string().trim().max(500).optional().or(z.literal("")),
})

type InviteValues = z.infer<typeof InviteSchema>

export function InviteForm() {
  const [isPending, startTransition] = useTransition()
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const form = useForm<InviteValues>({
    resolver: zodResolver(InviteSchema),
    defaultValues: { companyName: "", contactName: "", email: "", note: "" },
  })

  function onSubmit(values: InviteValues) {
    startTransition(async () => {
      const res = await inviteSupplier(values)
      if (res.ok) {
        setLink(res.registrationUrl)
        toast.success("Invitation created. Onboarding link is ready to share.")
        form.reset()
      } else {
        toast.error(res.message)
      }
    })
  }

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy — please copy the link manually.")
    }
  }

  return (
    <div className="space-y-5">
      {link ? (
        <div className="rounded-xl border border-emerald/40 bg-emerald/5 p-4">
          <p className="text-sm font-semibold text-navy">
            Registration link ready
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Share this token-gated link with the supplier. (Email delivery is
            wired up in Phase 7.)
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
              {link}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyLink}
              className="shrink-0 gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" /> Copy
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Fuel Co." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact name</FormLabel>
                <FormControl>
                  <Input placeholder="Jordan Rivera" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="jordan@acmefuel.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Personal note{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Add a short note that will accompany the invitation email."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end border-t border-border pt-5">
            <Button type="submit" size="lg" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send invitation
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
