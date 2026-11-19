import {
  MESSAGE_MAX_LENGTH,
  SAVED_REPLY_SHORTCUT_MAX_LENGTH,
  SAVED_REPLY_TITLE_MAX_LENGTH,
  savedReplyVisibilitySchema,
} from "@helpwren/core";
import { z } from "zod";

/** The saved reply editor's form. The client library parses the same values again on saving. */
export const savedReplyFormSchema = z.object({
  title: z.string().trim().min(1, "Give it a title.").max(SAVED_REPLY_TITLE_MAX_LENGTH),
  shortcut: z
    .string()
    .trim()
    .toLowerCase()
    .max(SAVED_REPLY_SHORTCUT_MAX_LENGTH)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, digits and hyphens."),
  visibility: savedReplyVisibilitySchema,
  body: z.string().trim().min(1, "Write the reply.").max(MESSAGE_MAX_LENGTH),
});

export type SavedReplyFormValues = z.infer<typeof savedReplyFormSchema>;
