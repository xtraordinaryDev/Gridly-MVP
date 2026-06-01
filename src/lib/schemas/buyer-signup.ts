import { z } from "zod"

export const BuyerSignupSchema = z
  .object({
    fullName: z.string().trim().min(1, "Your name is required"),
    companyName: z.string().trim().min(1, "Company name is required"),
    email: z.email("Enter a valid work email"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export type BuyerSignup = z.infer<typeof BuyerSignupSchema>
