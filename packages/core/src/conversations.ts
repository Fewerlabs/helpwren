import { z } from "zod";

import { type GuestDetails } from "./settings";

export const MESSAGE_MAX_LENGTH = 5000;

export const messageBodySchema = z.string().trim().min(1).max(MESSAGE_MAX_LENGTH);

/** A phone number in international format: a plus sign, the country code, then the number. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/);

export const contactDetailsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().pipe(z.email()).optional(),
  phone: phoneSchema.optional(),
});

export type ContactDetails = z.infer<typeof contactDetailsSchema>;

/** What `POST /api/conversations` accepts. */
export const startConversationInputSchema = z.object({
  message: messageBodySchema,
  source: z.string().trim().min(1).max(40).default("web"),
  /** Who is writing. Needed the first time, according to the install's guest details setting. */
  contact: contactDetailsSchema.default({}),
  /** The page the chat was opened from, shown to agents as context. */
  page: z
    .object({ url: z.url().max(2000), title: z.string().trim().max(300).optional() })
    .optional(),
});

export type StartConversationInput = z.input<typeof startConversationInputSchema>;

export const startConversationResultSchema = z.object({ conversationId: z.uuid() });

/** Whether these details are enough to start chatting under the install's setting. */
export function hasRequiredGuestDetails(
  required: GuestDetails,
  details: Partial<Record<keyof ContactDetails, string | null | undefined>>,
): boolean {
  if (required === "none") return true;
  if (!details.name) return false;
  if (required === "email") return Boolean(details.email);
  if (required === "phone") return Boolean(details.phone);
  return Boolean(details.email) || Boolean(details.phone);
}

/** The body of every failed API response. `code` is stable; `message` is for people. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "invalid_request",
      "unauthorized",
      "forbidden",
      "not_found",
      "details_required",
      "rate_limited",
    ]),
    message: z.string(),
  }),
});

export type ApiErrorCode = z.infer<typeof apiErrorSchema>["error"]["code"];

/** The database's error code for "slow down", raised by its rate limits. */
export const RATE_LIMITED_SQLSTATE = "HW429";
