"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import type { DocumentType } from "@/lib/data/documents"
import { saveUploadedDocument } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const MAX_MB = 10

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export function DocumentUploader({
  vendorId,
  type,
  hasExpiry,
  replace,
  preview,
}: {
  vendorId: string
  type: DocumentType
  hasExpiry?: boolean
  replace: boolean
  preview: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [expiresAt, setExpiresAt] = useState("")
  const [busy, setBusy] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleFile(file: File) {
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Files must be under ${MAX_MB} MB.`)
    setBusy(true)
    try {
      const path = `vendors/${vendorId}/${type}/${Date.now()}-${sanitize(file.name)}`
      if (!preview) {
        const supabase = createClient()
        const { error } = await supabase.storage.from("vendor-documents").upload(path, file, { upsert: true, contentType: file.type || undefined })
        if (error) throw new Error(error.message)
      }
      startTransition(async () => {
        const res = await saveUploadedDocument({ type, path, fileName: file.name, expiresAt })
        if (res.ok) {
          toast.success(replace ? "Document replaced" : "Document uploaded")
          setExpiresAt("")
          router.refresh()
        } else toast.error(res.message)
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  const working = busy || isPending
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasExpiry ? (
        <label className="text-xs text-muted-foreground">
          Expires
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="ml-2 inline-block h-8 w-36 align-middle" />
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
      <Button type="button" variant={replace ? "ghost" : "outline"} size="sm" className="gap-1.5" disabled={working} onClick={() => inputRef.current?.click()}>
        {working ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {replace ? "Replace" : "Upload"}
      </Button>
    </div>
  )
}
