import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/** Where attachments are kept: a private bucket with one folder per conversation. */
const BUCKET = "attachments";

/** The most files one message carries, and the largest one may be. The database agrees. */
export const ATTACHMENTS_MAX = 5;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** The kinds of file that can be sent. The bucket refuses anything else. */
export const ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

/** A file sent with a message. `path` is where it is stored; ask `attachments.urls` for a link. */
export const attachmentSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  type: z.string(),
  size: z.number().nonnegative(),
});

export type Attachment = z.infer<typeof attachmentSchema>;

export type UploadAttachmentResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; reason: "too_large" | "unsupported" | "forbidden" };

/** How long a link to a file works, in seconds. Long enough to read a conversation through. */
const LINK_LIFETIME = 60 * 60;

/** A name that is safe as part of a path. What the person called the file is kept beside it. */
function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(-80) || "file";
}

export const isImage = (attachment: Pick<Attachment, "type">) =>
  attachment.type.startsWith("image/");

export function createAttachments(supabase: HelpwrenSupabaseClient) {
  return {
    /**
     * Stores a file in a conversation, ready to be sent with a message. Only the conversation's
     * own contact and agents may. The file is not part of the conversation until a message
     * names it.
     */
    async upload(
      conversationId: string,
      file: Blob,
      name: string,
    ): Promise<UploadAttachmentResult> {
      if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
        return { ok: false, reason: "unsupported" };
      }
      if (file.size > ATTACHMENT_MAX_BYTES) return { ok: false, reason: "too_large" };

      const path = `${conversationId}/${crypto.randomUUID()}-${safeName(name)}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type });
      if (error) {
        // Storage reports a refusal by the access rules as a 403.
        if ("statusCode" in error && String(error.statusCode) === "403") {
          return { ok: false, reason: "forbidden" };
        }
        throw new HelpwrenError("Could not upload the file.", { cause: error });
      }
      return { ok: true, attachment: { path, name, type: file.type, size: file.size } };
    },

    /**
     * Links to files, by their paths. The files are private, so each link is signed and works
     * for an hour. A file the caller may not read is left out.
     */
    async urls(paths: readonly string[]): Promise<Record<string, string>> {
      if (paths.length === 0) return {};
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls([...paths], LINK_LIFETIME);
      if (error) throw new HelpwrenError("Could not load the files.", { cause: error });
      return Object.fromEntries(
        data.flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [])),
      );
    },
  };
}

export type AttachmentsApi = ReturnType<typeof createAttachments>;
