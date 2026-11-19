import { randomUUID } from "node:crypto";

import { ATTACHMENT_MAX_BYTES, type Attachment } from "@helpwren/core";
import { z } from "zod";

import { isBlocked } from "@/lib/api/blocked";
import { getCaller } from "@/lib/api/caller";
import { detectAttachmentType } from "@/lib/api/file-type";
import { LIMITS } from "@/lib/api/limits";
import { checkLimits, requestNetwork } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/respond";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "attachments";

/** The most files one conversation's folder holds, sent or not, so a folder cannot fill a disk. */
const FILES_PER_CONVERSATION = 200;

/** A name that is safe as part of a path. What the person called the file is kept beside it. */
function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(-80) || "file";
}

/**
 * Stores a file in a conversation, for a message to carry. The conversation's own contact and
 * the team may. The server, not the browser, puts it in the bucket: it reads the bytes to learn
 * what the file really is, and keeps it under that type in the conversation's own folder.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/conversations/[id]/attachments">,
): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller) return apiError("unauthorized", "Sign in to send a file.");

  // The same answer for "no such conversation" and "not yours", so ids cannot be probed.
  const notFound = apiError("not_found", "No such conversation.");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return notFound;

  const limited = await checkLimits([
    [LIMITS.uploadPerNetwork, requestNetwork(request).key],
    [LIMITS.uploadPerSession, caller.id],
  ]);
  if (limited) return limited;

  // Most of a file that is too big is never read: the size it declares is refused first.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > ATTACHMENT_MAX_BYTES + 64 * 1024) {
    return apiError("too_large", "Files can be 10 MB at most.");
  }

  const { data: conversation, error } = await supabaseAdmin
    .from("conversations")
    .select("id, contact_id")
    .eq("id", id.data)
    .maybeSingle();
  if (error) throw error;
  if (!conversation || (!caller.isAgent && conversation.contact_id !== caller.id)) return notFound;
  if (!caller.isAgent && (await isBlocked(caller.id))) {
    return apiError("refused", "You can no longer send files here.");
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return apiError("invalid_request", "Send the file as `file`.");
  if (file.size > ATTACHMENT_MAX_BYTES) return apiError("too_large", "Files can be 10 MB at most.");
  const named = form?.get("name");
  const name = (typeof named === "string" && named.trim() ? named : file.name).slice(0, 200);

  const type = detectAttachmentType(new Uint8Array(await file.arrayBuffer()), file.type);
  if (!type) {
    return apiError(
      "unsupported",
      "That kind of file cannot be sent. Try an image, a PDF or a document.",
    );
  }

  const bucket = supabaseAdmin.storage.from(BUCKET);
  const { data: stored, error: listError } = await bucket.list(conversation.id, {
    limit: FILES_PER_CONVERSATION,
  });
  if (listError) throw listError;
  if (stored.length >= FILES_PER_CONVERSATION) {
    return apiError("rate_limited", "This conversation holds as many files as it can.");
  }

  const path = `${conversation.id}/${randomUUID()}-${safeName(name)}`;
  const { error: uploadError } = await bucket.upload(path, file, { contentType: type });
  if (uploadError) throw uploadError;

  const attachment: Attachment = { path, name, type, size: file.size };
  return Response.json(attachment, { status: 201 });
}
