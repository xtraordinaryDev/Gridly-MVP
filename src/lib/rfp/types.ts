export type RfpStatus = "draft" | "published" | "closed" | "awarded" | "cancelled"
export type InvitationStatus = "invited" | "viewed" | "responded" | "declined"
export type RfpRecurrence = "one_time" | "recurring"
export type RfpUrgency = "standard" | "rush" | "emergency"
export type PricingMode = "fixed" | "index"

export interface DeliverySiteView {
  address: string
  gallons: number | null
  tankSizeGallons: number | null
  deliveryWindow: string | null
}

export interface AttachmentView {
  name: string
  path: string
  size: number
}

export interface BuyerRfpListItem {
  id: string
  title: string
  fuelType: string
  quantityGallons: number
  deliveryStates: string[]
  status: RfpStatus
  invitedCount: number
  responseCount: number
  bidDueDate: string | null
}

export interface RfpInvitationView {
  id: string
  vendorId: string
  companyName: string
  status: InvitationStatus
  invitedAt: string
  viewedAt: string | null
  respondedAt: string | null
}

export interface RfpResponseView {
  id: string
  vendorId: string
  companyName: string
  pricingMode: PricingMode
  indexName: string | null
  differential: number | null
  attachmentName: string | null
  attachmentPath: string | null
  pricePerGallon: number
  totalPrice: number
  deliveryTerms: string
  validityDays: number
  notes: string | null
  submittedAt: string
  status: string
}

export interface RfpActivityItem {
  id: string
  label: string
  date: string
  type: "created" | "published" | "invited" | "viewed" | "bid" | "declined" | "awarded" | "closed"
}

export interface BuyerRfpDetail {
  id: string
  title: string
  description: string
  fuelType: string
  quantityGallons: number
  recurrence: RfpRecurrence
  urgency: RfpUrgency
  deliveryStates: string[]
  deliveryAddresses: string[]
  deliverySites: DeliverySiteView[]
  attachments: AttachmentView[]
  pricingMode: PricingMode
  indexName: string | null
  deliveryDates: string[]
  requiredCapabilities: string[]
  requiredCertifications: string[]
  insuranceRequirements: string | null
  bidDueDate: string | null
  decisionDate: string | null
  expectedAwardDate: string | null
  status: RfpStatus
  awardedVendorId: string | null
  awardedVendorName: string | null
  createdAt: string
  publishedAt: string | null
  invitations: RfpInvitationView[]
  responses: RfpResponseView[]
  activity: RfpActivityItem[]
}

export interface VendorOpportunityListItem {
  id: string
  invitationId: string
  buyer: string
  title: string
  fuelType: string
  quantityGallons: number
  states: string[]
  dueDate: string
  status: InvitationStatus
  urgency: RfpUrgency
  rfpStatus: RfpStatus
  biddingOpen: boolean
}

export interface VendorOpportunityDetail {
  id: string
  invitationId: string
  buyer: string
  title: string
  description: string
  fuelType: string
  quantityGallons: number
  deliveryStates: string[]
  deliveryAddresses: string[]
  deliverySites: DeliverySiteView[]
  attachments: AttachmentView[]
  pricingMode: PricingMode
  indexName: string | null
  deliveryDates: string[]
  requiredCapabilities: string[]
  requiredCertifications: string[]
  insuranceRequirements: string | null
  bidDueDate: string
  status: InvitationStatus
  urgency: RfpUrgency
  existingResponse: RfpResponseView | null
  rfpStatus: RfpStatus
  biddingOpen: boolean
  withdrawn: boolean
}
