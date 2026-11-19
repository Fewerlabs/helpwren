import "server-only";

import {
  createExpoPush,
  pushSettingsSchema,
  type PushAdapter,
  type PushMessage,
  type PushSettings,
} from "@helpwren/adapters";
import { parseSettings } from "@helpwren/core";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/admin";

/** The setting that says how the install sends pushes, and the secret Expo may need. */
export const PUSH_SETTING = "push";
export const EXPO_ACCESS_TOKEN_SECRET = "expo_access_token";

/** How many pushes one run takes on, and how often one is tried before it is given up on. */
const BATCH = 100;
const MAX_ATTEMPTS = 3;
/** Expo's receipts are ready after about fifteen minutes and kept for a day. */
const RECEIPT_AFTER_MS = 15 * 60 * 1000;
const RECEIPT_KEPT_MS = 24 * 60 * 60 * 1000;
/** How much of a reply a notification shows. */
const PREVIEW_LENGTH = 140;

async function stored(table: "settings" | "secrets", key: string): Promise<unknown> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value;
}

export async function getPushSettings(): Promise<PushSettings> {
  return pushSettingsSchema.parse((await stored("settings", PUSH_SETTING)) ?? { provider: "none" });
}

/** Whether an Expo access token is kept. Its value never leaves the server. */
export async function hasExpoAccessToken(): Promise<boolean> {
  return typeof (await stored("secrets", EXPO_ACCESS_TOKEN_SECRET)) === "string";
}

/**
 * Only for a caller that has checked the person asking is an admin. `accessToken`: a new
 * value replaces the kept one, `null` removes it, and leaving it out keeps it.
 */
export async function savePushSettings(
  settings: PushSettings,
  accessToken?: string | null,
): Promise<void> {
  const saved = await supabaseAdmin
    .from("settings")
    .upsert({ key: PUSH_SETTING, value: settings, is_public: false });
  if (saved.error) throw saved.error;

  if (accessToken === null) {
    const removed = await supabaseAdmin
      .from("secrets")
      .delete()
      .eq("key", EXPO_ACCESS_TOKEN_SECRET);
    if (removed.error) throw removed.error;
  } else if (accessToken !== undefined) {
    const kept = await supabaseAdmin
      .from("secrets")
      .upsert({ key: EXPO_ACCESS_TOKEN_SECRET, value: accessToken });
    if (kept.error) throw kept.error;
  }
}

/** The way this install sends pushes, or `null` when it sends none. */
export async function getPushAdapter(): Promise<PushAdapter | null> {
  const settings = await getPushSettings();
  if (settings.provider === "none") return null;
  const token = await stored("secrets", EXPO_ACCESS_TOKEN_SECRET);
  return createExpoPush({ accessToken: typeof token === "string" ? token : undefined });
}

export interface PushRun {
  sent: number;
  skipped: number;
  failed: number;
  /** Devices forgotten because the push service said they are gone. */
  removedDevices: number;
}

async function forgetDevices(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabaseAdmin.from("devices").delete().in("id", ids);
  if (error) throw error;
}

/** Asks what became of pushes sent a while ago, and forgets the devices that are gone. */
async function checkReceipts(adapter: PushAdapter): Promise<number> {
  const ready = new Date(Date.now() - RECEIPT_AFTER_MS).toISOString();
  const { data: tickets, error } = await supabaseAdmin
    .from("push_tickets")
    .select("id, device_id, created_at")
    .lt("created_at", ready)
    .order("created_at")
    .limit(1000);
  if (error) throw error;
  if (tickets.length === 0) return 0;

  const receipts = await adapter.receipts(tickets.map((ticket) => ticket.id));
  const gone = tickets
    .filter((ticket) => {
      const receipt = receipts.get(ticket.id);
      return receipt && !receipt.ok && receipt.reason === "gone";
    })
    .map((ticket) => ticket.device_id);
  await forgetDevices([...new Set(gone)]);

  // A ticket is done with once it has its receipt, or once the service no longer keeps one.
  const expired = Date.now() - RECEIPT_KEPT_MS;
  const done = tickets
    .filter((ticket) => receipts.has(ticket.id) || Date.parse(ticket.created_at) < expired)
    .map((ticket) => ticket.id);
  if (done.length > 0) {
    const removed = await supabaseAdmin.from("push_tickets").delete().in("id", done);
    if (removed.error) throw removed.error;
  }
  return new Set(gone).size;
}

const conversationSchema = z.object({
  id: z.uuid(),
  unread_for_contact: z.number(),
  contact: z.object({ id: z.uuid(), external_id: z.string().nullable() }),
});

/** The phones a contact can be reached on: theirs, and their product account's. */
async function devicesOf(contact: { id: string; external_id: string | null }) {
  const owners = [`contact_id.eq.${contact.id}`];
  if (contact.external_id !== null) {
    owners.push(`external_id.eq.${JSON.stringify(contact.external_id)}`);
  }
  const { data, error } = await supabaseAdmin
    .from("devices")
    .select("id, push_token")
    .or(owners.join(","));
  if (error) throw error;
  return data;
}

/** All the replies the contact has not read, across their conversations, for the app's icon. */
async function badgeFor(contactId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("unread_for_contact")
    .eq("contact_id", contactId);
  if (error) throw error;
  return data.reduce((total, row) => total + row.unread_for_contact, 0);
}

function preview(body: string | null): string {
  if (body === null) return "Sent you a file.";
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1)}…` : text;
}

/**
 * Sends the pushes that are due: one notification per conversation, however many replies came
 * since the last run, and none for a reply that was read in the chat meanwhile. A scheduler
 * calls this every minute through `/api/jobs/push`.
 */
export async function processPushQueue(adapter: PushAdapter | null = null): Promise<PushRun> {
  const run: PushRun = { sent: 0, skipped: 0, failed: 0, removedDevices: 0 };
  const push = adapter ?? (await getPushAdapter());

  const claimed = await supabaseAdmin.rpc("claim_push_queue", { batch: BATCH });
  if (claimed.error) throw claimed.error;
  const jobs = claimed.data;

  async function finish(ids: readonly string[], outcome: "sent" | "skipped" | "failed" | "retry") {
    if (ids.length === 0) return;
    const affected = jobs.filter((job) => ids.includes(job.id));
    const retry = outcome === "retry" && affected.every((job) => job.attempts < MAX_ATTEMPTS);
    const final = outcome === "retry" ? "failed" : outcome;
    const { error } = await supabaseAdmin
      .from("push_queue")
      .update(retry ? { claimed_at: null } : { done_at: new Date().toISOString(), outcome: final })
      .in("id", ids);
    if (error) throw error;
    if (!retry) run[final] += ids.length;
  }

  if (!push) {
    // Push is off: what is owed is let go of, so the queue does not grow.
    await finish(
      jobs.map((job) => job.id),
      "skipped",
    );
    return run;
  }

  run.removedDevices += await checkReceipts(push);

  const settings = parseSettings(
    (await supabaseAdmin.from("settings").select("key, value")).data ?? [],
  );
  const byConversation = new Map<string, typeof jobs>();
  for (const job of jobs) {
    byConversation.set(job.conversation_id, [
      ...(byConversation.get(job.conversation_id) ?? []),
      job,
    ]);
  }

  for (const [conversationId, owed] of byConversation) {
    const ids = owed.map((job) => job.id);
    const { data: row, error } = await supabaseAdmin
      .from("conversations")
      .select("id, unread_for_contact, contact:contacts!inner(id, external_id)")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) throw error;
    const conversation = conversationSchema.safeParse(row);
    // Read in the chat since: the person already has it.
    if (!conversation.success || conversation.data.unread_for_contact === 0) {
      await finish(ids, "skipped");
      continue;
    }

    const devices = await devicesOf(conversation.data.contact);
    if (devices.length === 0) {
      await finish(ids, "skipped");
      continue;
    }

    // The newest reply is the one the notification shows.
    const latest = owed.toSorted((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const { data: message, error: messageError } = await supabaseAdmin
      .from("messages")
      .select("body")
      .eq("id", latest?.message_id ?? "")
      .maybeSingle();
    if (messageError) throw messageError;

    const badge = await badgeFor(conversation.data.contact.id);
    const messages: PushMessage[] = devices.map((device) => ({
      to: device.push_token,
      title: settings.brand.name,
      body: preview(message?.body ?? null),
      data: { type: "support", conversationId },
      group: conversationId,
      badge,
    }));

    let tickets;
    try {
      tickets = await push.send(messages);
    } catch {
      await finish(ids, "retry");
      continue;
    }

    const delivered = tickets.flatMap((ticket, index) =>
      ticket.ok ? [{ id: ticket.id, device_id: devices[index]?.id ?? "" }] : [],
    );
    if (delivered.length > 0) {
      const inserted = await supabaseAdmin.from("push_tickets").insert(delivered);
      if (inserted.error) throw inserted.error;
    }
    const gone = tickets.flatMap((ticket, index) =>
      !ticket.ok && ticket.reason === "gone" ? [devices[index]?.id ?? ""] : [],
    );
    await forgetDevices(gone);
    run.removedDevices += gone.length;

    await finish(ids, delivered.length > 0 ? "sent" : "failed");
  }
  return run;
}
