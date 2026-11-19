import "server-only";

import { randomUUID } from "node:crypto";

import { ATTACHMENT_MAX_BYTES, type Attachment } from "@helpwren/core";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { detectAttachmentType } from "./file-type";

const BUCKET = "attachments";

/** The most files one conversation's folder holds, sent or not, so a folder cannot fill a disk. */
export const FILES_PER_CONVERSATION = 200;

/** A name that is safe as part of a path. What the person called the file is kept beside it. */
function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(-80) || "file";
}

export type StoreAttachmentResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; reason: "too_large" | "unsupported" | "full" };

/**
 * Puts a file in a conversation's folder, for a message to carry. The only way a file reaches
 * the bucket: its bytes say what it really is, anything not on the list is refused, and it is
 * kept under the type it was found to be. The caller has already checked who may add it.
 */
export async function storeAttachment(
  conversationId: string,
  file: { bytes: Uint8Array; name: string; type: string },
): Promise<StoreAttachmentResult> {
  if (file.bytes.byteLength > ATTACHMENT_MAX_BYTES) return { ok: false, reason: "too_large" };
  const type = detectAttachmentType(file.bytes, file.type);
  if (!type) return { ok: false, reason: "unsupported" };

  const bucket = supabaseAdmin.storage.from(BUCKET);
  const { data: stored, error: listError } = await bucket.list(conversationId, {
    limit: FILES_PER_CONVERSATION,
  });
  if (listError) throw listError;
  if (stored.length >= FILES_PER_CONVERSATION) return { ok: false, reason: "full" };

  const name = file.name.trim().slice(0, 200) || "file";
  const path = `${conversationId}/${randomUUID()}-${safeName(name)}`;
  const { error } = await bucket.upload(path, file.bytes, { contentType: type });
  if (error) throw error;
  return { ok: true, attachment: { path, name, type, size: file.bytes.byteLength } };
}
