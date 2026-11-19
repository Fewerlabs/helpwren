import { z } from "zod";

import { type Api } from "./api";
import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/** Where attachments are kept: a private bucket with one folder per conversation. */
const BUCKET = "attachments";

/** The most files one message carries, and the largest one may be. The database agrees. */
export const ATTACHMENTS_MAX = 5;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** The kinds of file that can be sent. The server checks each file's bytes against these. */
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
  | { ok: false; reason: "too_large" | "unsupported" | "forbidden" | "rate_limited" };

/** How long a link to a file works, in seconds. Long enough to read a conversation through. */
const LINK_LIFETIME = 60 * 60;

export const isImage = (attachment: Pick<Attachment, "type">) =>
  attachment.type.startsWith("image/");

export function createAttachments(supabase: HelpwrenSupabaseClient, api: Api) {
  /** Signed links to some files, keyed by path, leaving out any the caller may not read. */
  async function sign(paths: string[], download: boolean): Promise<[string, string][]> {
    if (paths.length === 0) return [];
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, LINK_LIFETIME, download ? { download: true } : undefined);
    if (error) throw new HelpwrenError("Could not load the files.", { cause: error });
    return data.flatMap((item) =>
      item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [],
    );
  }

  return {
    /**
     * Stores a file in a conversation, ready to be sent with a message. Only the conversation's
     * own contact and agents may. The server checks the file's bytes, not its name, and keeps
     * it under the type it really is. It is not part of the conversation until a message
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

      const form = new FormData();
      form.set("file", file);
      form.set("name", name);
      const result = await api.post(
        `/api/conversations/${z.uuid().parse(conversationId)}/attachments`,
        form,
        attachmentSchema,
      );
      if (result.ok) return { ok: true, attachment: result.data };
      switch (result.code) {
        case "too_large":
        case "unsupported":
        case "rate_limited":
          return { ok: false, reason: result.code };
        case "forbidden":
        case "not_found":
        case "refused":
          return { ok: false, reason: "forbidden" };
        default:
          throw new HelpwrenError(`Could not upload the file: ${result.message}`);
      }
    },

    /**
     * Links to files. The files are private, so each link is signed and works for an hour. A
     * picture opens in place; any other file downloads, so nothing in a file can run as a page
     * of the storage's site. A file the caller may not read is left out.
     */
    async urls(
      attachments: readonly Pick<Attachment, "path" | "type">[],
    ): Promise<Record<string, string>> {
      const pictures = attachments.filter(isImage).map((attachment) => attachment.path);
      const others = attachments
        .filter((attachment) => !isImage(attachment))
        .map((attachment) => attachment.path);
      const [shown, downloaded] = await Promise.all([sign(pictures, false), sign(others, true)]);
      return Object.fromEntries([...shown, ...downloaded]);
    },
  };
}

export type AttachmentsApi = ReturnType<typeof createAttachments>;
