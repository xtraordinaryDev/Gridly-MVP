"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { BuyerSignupSchema, type BuyerSignup } from "@/lib/schemas/buyer-signup"
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
import { signUpBuyer } from "./actions"

export function SignupForm({ preview }: { preview: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<BuyerSignup>({
    resolver: zodResolver(BuyerSignupSchema),
    defaultValues: {
      fullName: "",
      companyName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  function onSubmit(values: BuyerSignup) {
    startTransition(async () => {
      const res = await signUpBuyer(values)
      if (res.ok) {
        toast.success("Welcome to GridLink.")
        router.push("/buyer/dashboard")
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
                <Input type="password" placeholder="Re-enter password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted-foreground">
          Buyer accounts only. Fuel suppliers apply via{" "}
          <Link href="/become-a-supplier" className="text-brand-blue hover:underline">
            Become a Supplier
          </Link>
          .
        </p>

        <Button type="submit" size="lg" disabled={isPending} className="w-full gap-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create buyer account
        </Button>

        {preview ? (
          <p className="text-center text-xs text-muted-foreground">
            Preview mode — you&apos;ll land on the buyer dashboard.
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
