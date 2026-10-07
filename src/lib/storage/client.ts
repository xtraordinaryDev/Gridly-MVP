import { createClient } from "@/lib/supabase/client"

/** Puts a file at the path a server action just authorised. */
export async function putSignedUpload(ticket: { bucket: string; path: string; token: string; contentType: string }, file: File): Promise<void> {
  // supabase-js takes a Blob's own type over the contentType option, and
  // browsers report odd or empty types (CSV on Windows), so re-wrap the bytes
  // with the type the server chose — the buckets only accept those.
  const body = new Blob([file], { type: ticket.contentType })
  const { error } = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, body, { contentType: ticket.contentType })
  if (error) throw new Error(/mime|size|exceeded/i.test(error.message) ? "That file was rejected — check its type and size." : "Upload failed. Please try again.")
}
