"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"

import type { DocumentType } from "@/lib/data/documents"
import { putSignedUpload } from "@/lib/storage/client"
import { checkUpload } from "@/lib/storage/paths"
import { createDocumentUpload, saveUploadedDocument } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function DocumentUploader({
  type,
  label,
  hasExpiry,
  expiryRequired,
  currentExpiry,
  replace,
  preview,
}: {
  type: DocumentType
  label: string
  hasExpiry?: boolean
  expiryRequired?: boolean
  /** Expiry on file (YYYY-MM-DD); pre-filled so a replace doesn't drop it unnoticed. */
  currentExpiry?: string | null
  replace: boolean
  preview: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [expiresAt, setExpiresAt] = useState(currentExpiry ?? "")
  const [busy, setBusy] = useState(false)

  function pickFile() {
    if (expiryRequired && !expiresAt) return toast.error(`Enter the expiry date for your ${label} first.`)
    inputRef.current?.click()
  }

  async function handleFile(file: File) {
    const check = checkUpload("document", file)
    if (!check.ok) return toast.error(check.message)
    setBusy(true)
    try {
      let path = `vendors/preview/${type}/${file.name}`
      if (!preview) {
        const ticket = await createDocumentUpload(type, { name: file.name, size: file.size, type: file.type }, expiresAt)
        if (!ticket.ok) throw new Error(ticket.message)
        await putSignedUpload(ticket, file)
        path = ticket.path
      }
      const res = await saveUploadedDocument({ type, path, fileName: file.name, ...(hasExpiry ? { expiresAt } : {}) })
      if (!res.ok) throw new Error(res.message)
      toast.success(replace ? "Document replaced" : "Document uploaded")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasExpiry ? (
        <label className="text-xs text-muted-foreground">
          Expires{expiryRequired ? <span className="text-destructive"> *</span> : null}
          <Input type="date" required={expiryRequired} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="ml-2 inline-block h-8 w-36 align-middle" />
        </label>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.currentTarget.value = ""
        }}
      />
      <Button type="button" variant={replace ? "ghost" : "outline"} size="sm" className="gap-1.5" disabled={busy} onClick={pickFile}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {replace ? "Replace" : "Upload"}
      </Button>
    </div>
  )
}
