"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Building2, Loader2, ShieldCheck, Truck } from "lucide-react"

import type { Role } from "@/lib/auth"

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
import { signIn, signInAsDemo } from "./actions"

const DEMO_ROLES: {
  role: Role
  label: string
  company: (preview: boolean) => string
  icon: typeof Building2
  iconClass: string
}[] = [
  {
    role: "buyer",
    label: "Buyer",
    company: (preview) =>
      preview ? "Metro Transit Authority" : "Mercy Regional Health System",
    icon: Building2,
    iconClass: "text-brand-blue",
  },
  {
    role: "vendor",
    label: "Supplier",
    company: () => "Apex Fuel Co.",
    icon: Truck,
    iconClass: "text-emerald",
  },
  {
    role: "admin",
    label: "Admin",
    company: () => "GridLink Team",
    icon: ShieldCheck,
    iconClass: "text-navy",
  },
]

export function LoginForm({ preview }: { preview: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [demoRole, setDemoRole] = useState<Role | null>(null)

  function handleDemo(role: Role) {
    setDemoRole(role)
    startTransition(async () => {
      const res = await signInAsDemo(role)
      if (res.ok) {
        router.push(res.redirectTo)
        router.refresh()
      } else {
        setDemoRole(null)
        toast.error(res.message)
      }
    })
  }

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

        <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted/40 p-3">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Demo — sign in as
          </p>
          <div className="grid gap-2">
            {DEMO_ROLES.map((d) => (
              <button
                key={d.role}
                type="button"
                disabled={isPending}
                onClick={() => handleDemo(d.role)}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-medium text-navy transition-colors hover:border-brand-blue/40 hover:bg-brand-blue/5 disabled:opacity-60"
              >
                {demoRole === d.role && isPending ? (
                  <Loader2 className={`size-4 animate-spin ${d.iconClass}`} />
                ) : (
                  <d.icon className={`size-4 ${d.iconClass}`} />
                )}
                {d.label} — {d.company(preview)}
              </button>
            ))}
          </div>
        </div>

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
