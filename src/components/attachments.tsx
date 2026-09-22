"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import type { Attachment } from "@/lib/schemas/rfp-wizard"
import { getAttachmentUrl } from "@/app/attachments/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_MB = 15

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB"]
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/** Uploads straight from the browser to the private rfp-attachments bucket. */
export async function uploadAttachment(file: File, prefix: string, preview: boolean): Promise<Attachment> {
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Files must be under ${MAX_MB} MB.`)
  const path = `${prefix}/${Date.now()}-${sanitize(file.name)}`
  if (!preview) {
    const supabase = createClient()
    const { error } = await supabase.storage.from("rfp-attachments").upload(path, file, { upsert: false, contentType: file.type || undefined })
    if (error) throw new Error(error.message)
  }
  return { name: file.name, path, size: file.size }
}

/** Multi-file attachment list with add/remove, for the RFP wizard. */
export function AttachmentsField({
  value,
  onChange,
  prefix,
  preview,
  label = "Attachments",
  hint = "Spec sheets, site maps, tank lists, insurance requirements. PDF, images, or spreadsheets up to 15 MB each.",
}: {
  value: Attachment[]
  onChange: (next: Attachment[]) => void
  prefix: string
  preview: boolean
  label?: string
  hint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <ul className="mt-2 space-y-1.5">
        {value.map((a) => (
          <li key={a.path} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{a.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(a.size)}</span>
            </span>
            <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => onChange(value.filter((x) => x.path !== a.path))}>
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.docx"
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? [])
          e.currentTarget.value = ""
          if (!files.length) return
          setBusy(true)
          try {
            const added: Attachment[] = []
            for (const f of files) added.push(await uploadAttachment(f, prefix, preview))
            onChange([...value, ...added])
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed")
          } finally {
            setBusy(false)
          }
        }}
      />
      <Button type="button" variant="outline" size="sm" className="mt-2 gap-1.5" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        Add files
      </Button>
    </div>
  )
}

/** Read-only list with signed-URL downloads. */
export function AttachmentList({
  attachments,
  bucket = "rfp-attachments",
  className,
  emptyText,
}: {
  attachments: { name: string; path: string; size?: number }[]
  bucket?: "rfp-attachments" | "delivery-docs"
  className?: string
  emptyText?: string
}) {
  const [isPending, startTransition] = useTransition()
  if (!attachments.length) return emptyText ? <p className={cn("text-sm text-muted-foreground", className)}>{emptyText}</p> : null
  return (
    <ul className={cn("space-y-1.5", className)}>
      {attachments.map((a) => (
        <li key={a.path}>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const res = await getAttachmentUrl(a.path, bucket)
                if (res.ok) window.open(res.url, "_blank", "noopener")
                else toast.error(res.message)
              })
            }
            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted/40"
          >
            <Paperclip className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{a.name}</span>
            {a.size ? <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(a.size)}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  )
}
