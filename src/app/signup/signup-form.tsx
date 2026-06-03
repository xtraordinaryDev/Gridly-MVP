"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import {
  BUYER_INDUSTRIES,
  BUYER_VOLUME_RANGES,
  BuyerAccessRequestSchema,
  type BuyerAccessRequest,
} from "@/lib/schemas/buyer-access-request"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { requestBuyerAccess } from "./actions"

export function SignupForm({ preview }: { preview: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<BuyerAccessRequest>({
    resolver: zodResolver(BuyerAccessRequestSchema),
    defaultValues: {
      fullName: "",
      companyName: "",
      email: "",
      phone: "",
      industry: undefined,
      estimatedVolume: undefined,
      useCase: "",
    },
  })

  function onSubmit(values: BuyerAccessRequest) {
    startTransition(async () => {
      const res = await requestBuyerAccess(values)
      if (res.ok) {
        router.push("/signup/submitted")
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input placeholder="Jordan Kim" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company / organization</FormLabel>
              <FormControl>
                <Input placeholder="Metro Transit Authority" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BUYER_INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estimatedVolume"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual fuel volume</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BUYER_VOLUME_RANGES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="useCase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What do you need GridLink for?</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Tell us about your fuel procurement needs, fleet/sites, and what you're looking to source."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted-foreground">
          Fuel suppliers apply via{" "}
          <Link href="/become-a-supplier" className="text-brand-blue hover:underline">
            Become a Supplier
          </Link>
          .
        </p>

        <Button type="submit" size="lg" disabled={isPending} className="w-full gap-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Request access
        </Button>

        {preview ? (
          <p className="text-center text-xs text-muted-foreground">
            Preview mode — submitting shows the confirmation page.
          </p>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-blue hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  )
}
