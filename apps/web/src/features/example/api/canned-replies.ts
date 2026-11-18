import {
  cannedReplyPageSchema,
  cannedReplySchema,
  newCannedReplySchema,
  type CannedReply,
  type CannedReplyPage,
  type NewCannedReply,
} from "../schemas/canned-reply";

/**
 * Data access for canned replies.
 *
 * There is no backend yet, so this keeps the replies in memory and waits a moment
 * before answering, like a network would. The shape is what the real client will
 * have: every answer is parsed with its schema before it leaves this file, so the
 * rest of the feature can trust the types.
 */

const LATENCY_MS = 350;

const seed: readonly (readonly [title: string, shortcut: string, body: string])[] = [
  ["Greeting", "hello", "Hi, thanks for getting in touch. How can I help?"],
  [
    "Refund started",
    "refund",
    "I've started your refund. It should reach you in two to three working days.",
  ],
  ["Ask for order number", "order", "Could you share your order number so I can look into this?"],
  [
    "Password reset",
    "reset",
    "I've sent a link to reset your password. It works for the next hour.",
  ],
  ["Booking changed", "moved", "Your booking has been moved. You'll get a confirmation by email."],
  ["Escalated", "escalate", "I've passed this to a specialist, who will reply here shortly."],
  ["Away", "away", "We're away right now. We'll reply here and by email as soon as we're back."],
  ["Closing", "bye", "Glad that's sorted. Reply here any time if you need anything else."],
  ["Payout delay", "payout", "Payouts can take up to two working days to appear in your account."],
  ["Duplicate charge", "double", "I can see both charges and have refunded one of them."],
  ["App update", "update", "Please update the app to the latest version and try again."],
  ["Screenshot", "screenshot", "Could you send a screenshot of what you're seeing?"],
];

let replies: CannedReply[] = seed.map(([title, shortcut, body], index) => ({
  id: `reply-${index + 1}`,
  title,
  shortcut,
  body,
  createdAt: new Date(Date.UTC(2026, 10, 1 + index)).toISOString(),
}));

function wait(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, LATENCY_MS);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

export interface ListCannedRepliesRequest {
  search: string;
  cursor: number | undefined;
  pageSize: number;
  signal?: AbortSignal;
}

export async function listCannedReplies({
  search,
  cursor = 0,
  pageSize,
  signal,
}: ListCannedRepliesRequest): Promise<CannedReplyPage> {
  await wait(signal);
  const term = search.trim().toLowerCase();
  const matches = replies.filter((reply) =>
    [reply.title, reply.shortcut, reply.body].some((text) => text.toLowerCase().includes(term)),
  );
  const next = cursor + pageSize;

  return cannedReplyPageSchema.parse({
    items: matches.slice(cursor, next),
    nextCursor: next < matches.length ? next : undefined,
    total: matches.length,
  });
}

/** Thrown when a shortcut is already in use, so the form can show it on that field. */
export class ShortcutTakenError extends Error {
  constructor(shortcut: string) {
    super(`The shortcut /${shortcut} is already in use.`);
    this.name = "ShortcutTakenError";
  }
}

export async function createCannedReply(input: NewCannedReply): Promise<CannedReply> {
  const values = newCannedReplySchema.parse(input);
  await wait();
  if (replies.some((reply) => reply.shortcut === values.shortcut)) {
    throw new ShortcutTakenError(values.shortcut);
  }
  const reply = cannedReplySchema.parse({
    ...values,
    id: `reply-${replies.length + 1}`,
    createdAt: new Date().toISOString(),
  });
  replies = [reply, ...replies];
  return reply;
}
