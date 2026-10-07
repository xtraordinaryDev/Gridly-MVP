import { z } from "zod"

export const CreateAccountSchema = z
  .object({
    password: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(72, "Use 72 characters or fewer"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export type CreateAccountValues = z.infer<typeof CreateAccountSchema>
