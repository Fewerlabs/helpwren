import { z } from "zod";

import { type PushAdapter, type PushMessage, type PushReceipt, type PushTicket } from "./types";

const EXPO_API = "https://exp.host/--/api/v2/push";
/** The most messages Expo takes in one request, and the most receipts it answers at once. */
const SEND_CHUNK = 100;
const RECEIPT_CHUNK = 1000;
const TIMEOUT_MS = 10_000;

export interface ExpoPushOptions {
  /** Needed when the Expo project has enhanced push security turned on. */
  accessToken?: string | undefined;
  /** Replaces Expo's address, for tests. */
  apiUrl?: string;
  /** Replaces `fetch`, for tests. */
  fetch?: typeof globalThis.fetch;
}

const errorSchema = z.object({
  status: z.literal("error"),
  message: z.string().default(""),
  details: z.object({ error: z.string().optional() }).optional(),
});

const ticketsSchema = z.object({
  data: z.array(z.union([z.object({ status: z.literal("ok"), id: z.string() }), errorSchema])),
});

const receiptsSchema = z.object({
  data: z.record(z.string(), z.union([z.object({ status: z.literal("ok") }), errorSchema])),
});

/** A device Expo says will never receive anything again. */
function failure(error: z.infer<typeof errorSchema>) {
  const code = error.details?.error;
  return {
    ok: false as const,
    reason: code === "DeviceNotRegistered" ? ("gone" as const) : ("failed" as const),
    detail: code ? `${code}: ${error.message}` : error.message,
  };
}

function chunks<Item>(items: readonly Item[], size: number): Item[][] {
  const result: Item[][] = [];
  for (let start = 0; start < items.length; start += size) {
    result.push(items.slice(start, start + size));
  }
  return result;
}

/** What Expo is sent for one message. Grouping uses both platforms' own fields. */
function toExpo(message: PushMessage) {
  return {
    to: message.to,
    title: message.title,
    body: message.body,
    data: message.data,
    sound: "default",
    priority: "high",
    // iOS replaces a shown notification with the same id; Android, one with the same tag.
    collapseId: message.group,
    tag: message.group,
    ...(message.badge === undefined ? {} : { badge: message.badge }),
  };
}

/**
 * Pushes through Expo's push service, for apps built with Expo. Expo hands each message to
 * Apple or Google and answers with a ticket; a receipt for each ticket is ready some minutes
 * later and says whether the device is still there.
 */
export function createExpoPush(options: ExpoPushOptions = {}): PushAdapter {
  const send = options.fetch ?? globalThis.fetch.bind(globalThis);
  const apiUrl = options.apiUrl ?? EXPO_API;

  async function post(path: string, body: unknown): Promise<unknown> {
    const response = await send(`${apiUrl}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const errors = (payload as { errors?: { message?: string }[] } | null)?.errors;
      throw new Error(
        `Expo answered ${String(response.status)}: ${errors?.[0]?.message ?? "no details"}`,
      );
    }
    return payload;
  }

  return {
    name: "Expo",

    async send(messages) {
      const tickets: PushTicket[] = [];
      for (const chunk of chunks(messages, SEND_CHUNK)) {
        const { data } = ticketsSchema.parse(await post("/send", chunk.map(toExpo)));
        if (data.length !== chunk.length) throw new Error("Expo answered for the wrong number.");
        for (const ticket of data) {
          tickets.push(ticket.status === "ok" ? { ok: true, id: ticket.id } : failure(ticket));
        }
      }
      return tickets;
    },

    async receipts(ticketIds) {
      const receipts = new Map<string, PushReceipt>();
      for (const chunk of chunks(ticketIds, RECEIPT_CHUNK)) {
        const { data } = receiptsSchema.parse(await post("/getReceipts", { ids: chunk }));
        for (const [id, receipt] of Object.entries(data)) {
          receipts.set(id, receipt.status === "ok" ? { ok: true } : failure(receipt));
        }
      }
      return receipts;
    },
  };
}

/** Whether a string is an Expo push token, which is all this adapter can send to. */
export function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]\s]{1,200}\]$/.test(token);
}
