import { z } from "zod"

export const ORDER_STATUSES = ["requested", "confirmed", "scheduled", "delivered", "cancelled"] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]
export const ORDER_URGENCY = ["standard", "rush", "emergency"] as const

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  scheduled: "Scheduled",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

export const PlaceOrderSchema = z
  .object({
    contractId: z.string().min(1, "Select a contract"),
    siteAddress: z.string().trim().min(3, "Choose a delivery site"),
    gallons: z.number({ error: "Enter gallons" }).positive("Enter gallons"),
    windowStart: z.string().min(1, "Choose the earliest delivery date"),
    windowEnd: z.string().min(1, "Choose the latest delivery date"),
    urgency: z.enum(ORDER_URGENCY),
    notes: z.string().trim().optional().or(z.literal("")),
  })
  .refine((v) => v.windowEnd >= v.windowStart, { path: ["windowEnd"], message: "Window end must be on or after the start" })

export type PlaceOrderValues = z.infer<typeof PlaceOrderSchema>

export const ConfirmOrderSchema = z.object({
  scheduledFor: z.string().min(1, "Pick a delivery date"),
  note: z.string().trim().optional().or(z.literal("")),
})

export const LogDeliverySchema = z.object({
  contractId: z.string().min(1),
  orderId: z.string().optional().or(z.literal("")),
  deliveredAt: z.string().min(1, "Delivery date is required"),
  siteAddress: z.string().trim().min(3, "Site is required"),
  gallons: z.number({ error: "Enter gallons delivered" }).positive("Enter gallons delivered"),
  ticketNumber: z.string().trim().optional().or(z.literal("")),
  bolPath: z.string().trim().optional().or(z.literal("")),
  bolName: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
})

export type LogDeliveryValues = z.infer<typeof LogDeliverySchema>
