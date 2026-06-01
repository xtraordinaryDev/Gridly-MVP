"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Lock } from "lucide-react"

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
import { createVendorAccount } from "./actions"
import { CreateAccountSchema, type CreateAccountValues } from "./schema"

type Values = CreateAccountValues

export function CreateAccountForm({
  token,
  email,
  preview,
}: {
  token: string
  email: string
  preview: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<Values>({
    resolver: zodResolver(CreateAccountSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  function onSubmit(values: Values) {
    startTransition(async () => {
      const res = await createVendorAccount(token, values)
      if (res.ok) {
        toast.success("Account created. Welcome to GridLink.")
        router.push("/vendor/dashboard")
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Email
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            {email}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            This is the email from your approved application.
          </p>
        </div>

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="At least 8 characters" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Re-enter your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={isPending} className="w-full gap-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create account & continue
        </Button>

        {preview ? (
          <p className="text-center text-xs text-muted-foreground">
            Preview mode — submitting takes you straight to the dashboard.
          </p>
        ) : null}
      </form>
    </Form>
  )
}
