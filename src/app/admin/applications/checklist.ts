/** What an admin confirms before a supplier becomes GridLink Verified. Approval requires every item. */
export const VERIFICATION_CHECKLIST = [
  "Company info verified",
  "COI valid & current",
  "W9 received",
  "Distributor license verified (if applicable)",
  "Insurance amounts adequate",
  "References checked",
  "Compliance documents reviewed",
] as const
