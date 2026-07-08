"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Building2, Loader2, ShieldCheck, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { LoginSchema, type LoginValues } from "./schema"
import { signIn } from "./actions"

export function LoginForm({ preview }: { preview: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  })

  function onSubmit(values: LoginValues) {
    startTransition(async () => {
      const res = await signIn(values)
      if (res.ok) {
        toast.success(preview ? "Signed in (preview)." : "Welcome back.")
        router.push(res.redirectTo)
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={isPending} className="w-full gap-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Sign in
        </Button>

        {preview ? (
          <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted/40 p-3">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demo — sign in as
            </p>
            <div className="grid gap-2">
              <Link
                href="/buyer/dashboard"
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-navy transition-colors hover:border-brand-blue/40 hover:bg-brand-blue/5"
              >
                <Building2 className="size-4 text-brand-blue" />
                Buyer — Metro Transit Authority
              </Link>
              <Link
                href="/vendor/dashboard"
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-navy transition-colors hover:border-brand-blue/40 hover:bg-brand-blue/5"
              >
                <Truck className="size-4 text-emerald" />
                Supplier — Apex Fuel Co.
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-navy transition-colors hover:border-brand-blue/40 hover:bg-brand-blue/5"
              >
                <ShieldCheck className="size-4 text-navy" />
                Admin — GridLink Team
              </Link>
            </div>
          </div>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          New buyer?{" "}
          <Link href="/signup" className="font-medium text-brand-blue hover:underline">
            Request access
          </Link>
        </p>
      </form>
    </Form>
  )
}
