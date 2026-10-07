"use client"

import { useRef, useState } from "react"
import { useController, useFormContext, type FieldValues, type Path } from "react-hook-form"
import { FileUp, FileText, Loader2, RefreshCw, X } from "lucide-react"

import { cn } from "@/lib/utils"
import type { DocumentRef } from "@/lib/schemas/vendor-application"
import { createRegistrationUpload, removeRegistrationUpload } from "@/app/vendor-registration/[token]/actions"
import { putSignedUpload } from "@/lib/storage/client"
import { UPLOAD_RULES, checkUpload, sanitizeFileName } from "@/lib/storage/paths"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export interface FileUploadFieldProps<TForm extends FieldValues> {
  /** RHF field name (must resolve to a DocumentRef | undefined). */
  name: Path<TForm>
  label: string
  /** Invitation token — what authorises the upload server-side. */
  token: string
  /** Which onboarding slot this file fills; the server puts it under that folder. */
  documentType: "w9" | "coi" | "distributor_license" | "logo"
  /** No backend configured: keep the file reference local and skip storage. */
  preview?: boolean
  accept?: string
  required?: boolean
  description?: string
}

export function FileUploadField<TForm extends FieldValues>({
  name,
  label,
  token,
  documentType,
  preview = false,
  accept = ".pdf,.png,.jpg,.jpeg",
  required = false,
  description,
}: FileUploadFieldProps<TForm>) {
  const { control, clearErrors } = useFormContext<TForm>()
  const {
    field,
    fieldState: { error },
  } = useController({ name, control })

  const value = field.value as DocumentRef | undefined
  const kind = documentType === "logo" ? "logo" : "document"
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setLocalError(null)

    const check = checkUpload(kind, file)
    if (!check.ok) {
      setLocalError(check.message)
      return
    }

    setUploading(true)
    setProgress(8)
    // supabase-js storage has no native progress callback; simulate a climb.
    const timer = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 12 : p))
    }, 200)

    try {
      let path = `preview/${documentType}/${sanitizeFileName(file.name)}`
      if (!preview) {
        const ticket = await createRegistrationUpload(token, documentType, { name: file.name, size: file.size, type: file.type })
        if (!ticket.ok) throw new Error(ticket.message)
        await putSignedUpload(ticket, file)
        path = ticket.path
      }

      setProgress(100)
      const previous = value?.path
      field.onChange({ path, name: file.name, size: file.size } satisfies DocumentRef)
      // A "please upload…" error from an earlier Continue is now stale.
      clearErrors(name)
      if (previous && previous !== path && !preview) void removeRegistrationUpload(token, previous)
    } catch (err) {
      console.error("Upload failed:", err)
      setLocalError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      )
    } finally {
      clearInterval(timer)
      setUploading(false)
    }
  }

  async function handleRemove() {
    const current = value
    setLocalError(null)
    field.onChange(undefined)
    setProgress(0)
    if (current?.path && !preview) {
      try {
        await removeRegistrationUpload(token, current.path)
      } catch (err) {
        console.error("Failed to remove file from storage:", err)
      }
    }
  }

  // A rejected pick (wrong type, too large) explains itself better than the schema's "required".
  const showError = localError || error?.message
  const maxSizeMb = UPLOAD_RULES[kind].maxMb

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {required ? <span className="text-destructive">*</span> : null}
      </div>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ""
        }}
      />

      {uploading ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Uploading…
          </div>
          <Progress value={progress} className="mt-3" />
        </div>
      ) : value ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald/40 bg-emerald/5 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald/15 text-emerald">
              <FileText className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {value.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(value.size)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => inputRef.current?.click()}
              aria-label="Replace file"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleRemove()}
              aria-label="Remove file"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center transition-colors hover:border-brand-blue/50 hover:bg-brand-blue/5",
            showError ? "border-destructive/60" : "border-border"
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
            <FileUp className="size-5" />
          </span>
          <span className="text-sm font-medium text-navy">
            Click to upload
          </span>
          <span className="text-xs text-muted-foreground">
            {accept.replaceAll(".", "").toUpperCase().replaceAll(",", ", ")} ·
            up to {maxSizeMb} MB
          </span>
        </button>
      )}

      {showError ? (
        <p className="text-sm text-destructive">{showError}</p>
      ) : null}
    </div>
  )
}
