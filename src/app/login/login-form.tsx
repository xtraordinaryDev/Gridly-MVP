"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

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
          <p className="text-center text-xs text-muted-foreground">
            Preview mode — redirects to the buyer dashboard.
          </p>
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
