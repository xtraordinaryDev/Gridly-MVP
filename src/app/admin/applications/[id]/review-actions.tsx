"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Check, Copy, Loader2, ShieldX, ThumbsUp, MessageSquareWarning } from "lucide-react"

import { cn } from "@/lib/utils"
import type {
  ApplicationDetail,
  ApplicationStatus,
} from "@/lib/data/applications"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/admin/status-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  approveApplication,
  rejectApplication,
  requestMoreInfo,
} from "../actions"
import { VERIFICATION_CHECKLIST as CHECKLIST } from "../checklist"

export function ReviewActions({
  application,
  preview,
  blockers,
  registrationUrl,
}: {
  application: ApplicationDetail
  preview: boolean
  /** What's missing before this can be approved (server-computed; the action re-checks). */
  blockers: string[]
  registrationUrl: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ApplicationStatus>(application.status)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState("")
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoMessage, setInfoMessage] = useState("")
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isPending, startTransition] = useTransition()

  const [copied, setCopied] = useState(false)

  const decided = status === "approved" || status === "rejected"
  const checkedCount = CHECKLIST.filter((item) => checked[item]).length
  const checklistDone = checkedCount === CHECKLIST.length
  const awaiting = status === "pending_review" && !application.registrationSubmitted

  async function copyRegistrationLink() {
    try {
      await navigator.clipboard.writeText(registrationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy — please copy the link manually.")
    }
  }

  function handleApprove() {
    startTransition(async () => {
      const res = await approveApplication(
        application.id,
        notes,
        CHECKLIST.filter((item) => checked[item])
      )
      if (res.ok) {
        setStatus("approved")
        toast.success(
          preview
            ? "Approved (preview) — vendor would be created & emailed."
            : "Application approved. Vendor created."
        )
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  function handleRequestInfo() {
    startTransition(async () => {
      const res = await requestMoreInfo(application.id, infoMessage)
      if (res.ok) {
        setStatus("info_requested")
        setInfoOpen(false)
        setInfoMessage("")
        toast.success(
          preview ? "Info requested (preview)." : "Requested more info from vendor."
        )
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      const res = await rejectApplication(application.id, rejectReason)
      if (res.ok) {
        setStatus("rejected")
        setRejectOpen(false)
        setRejectReason("")
        toast.success(preview ? "Rejected (preview)." : "Application rejected.")
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="sticky top-20 space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Status
          </span>
          <StatusBadge status={status} awaitingRegistration={awaiting} size="lg" />
        </div>

        {!decided && blockers.length ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="size-4 shrink-0" />
              Can&apos;t be approved yet
            </p>
            <p className="mt-1 text-xs">
              {application.registrationSubmitted
                ? "The registration is missing required documents:"
                : "The supplier hasn't completed the full registration. Missing:"}
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyRegistrationLink}
              className="mt-3 w-full gap-1.5 bg-background"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy registration link"}
            </Button>
          </div>
        ) : null}

        {/* Once decided, the checklist that was confirmed is in the activity log; an empty one here would mislead. */}
        {!decided ? (
          <>
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-navy">
            Verification checklist
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {checkedCount} of {CHECKLIST.length} confirmed · all required to approve
          </p>
          <div className="space-y-2">
            {CHECKLIST.map((item) => (
              <label
                key={item}
                className="flex cursor-pointer items-start gap-2.5 text-sm"
              >
                <Checkbox
                  checked={!!checked[item]}
                  onCheckedChange={(value) =>
                    setChecked((prev) => ({ ...prev, [item]: Boolean(value) }))
                  }
                  disabled={decided}
                  className="mt-0.5"
                />
                <span className="leading-snug text-foreground">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-navy">
            Internal notes
          </label>
          <Textarea
            rows={3}
            placeholder="Notes for the GridLink team (not shown to the vendor)…"
            value={notes}
            maxLength={1500}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Saved to the activity log when you approve.
          </p>
        </div>
          </>
        ) : null}
      </div>

      <div className="space-y-2.5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <Button
          type="button"
          size="lg"
          onClick={handleApprove}
          disabled={isPending || decided || blockers.length > 0 || !checklistDone}
          className="w-full gap-2 bg-emerald text-emerald-foreground hover:bg-emerald/90"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ThumbsUp className="size-4" />
          )}
          Approve
        </Button>
        {!decided && !blockers.length && !checklistDone ? (
          <p className="text-center text-xs text-muted-foreground">
            Confirm every checklist item to enable approval.
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setInfoOpen(true)}
          disabled={isPending || decided}
          className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <MessageSquareWarning className="size-4" />
          Request More Info
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setRejectOpen(true)}
          disabled={isPending || decided}
          className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <ShieldX className="size-4" />
          Reject
        </Button>

        {decided ? (
          <p className="pt-1 text-center text-xs text-muted-foreground">
            This application has been {status}.
          </p>
        ) : null}
      </div>

      {/* Request more info modal */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request more information</DialogTitle>
            <DialogDescription>
              Describe what the vendor needs to provide. We&apos;ll email them
              these items.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="e.g. Updated COI with $2M liability coverage; missing W-9."
            value={infoMessage}
            maxLength={2000}
            onChange={(e) => setInfoMessage(e.target.value)}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInfoOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRequestInfo}
              disabled={isPending || !infoMessage.trim()}
              className="gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject confirmation */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the application as rejected and email the applicant
              a standard notice. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            rows={3}
            placeholder="Reason (optional) — internal note for the activity log, not sent to the applicant…"
            value={rejectReason}
            maxLength={2000}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Reject application
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
