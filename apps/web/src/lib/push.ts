import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import {
  createExpoPush,
  createFcmPush,
  createWebhookPush,
  pushSettingsSchema,
  serviceAccountSchema,
  type PushAdapter,
  type PushEvent,
  type PushMessage,
  type PushSettings,
  type WebhookPush,
  type WebhookResult,
} from "@helpwren/adapters";
import { parseSettings } from "@helpwren/core";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/admin";

/** The setting that says how the install sends pushes, and the secrets each channel needs. */
export const PUSH_SETTING = "push";
export const EXPO_ACCESS_TOKEN_SECRET = "expo_access_token";
export const FCM_SERVICE_ACCOUNT_SECRET = "fcm_service_account";
export const PUSH_WEBHOOK_SECRET = "push_webhook_secret";

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
  return pushSettingsSchema.parse((await stored("settings", PUSH_SETTING)) ?? {});
}

/** Only for a caller that has checked the person asking is an admin. */
export async function savePushSettings(settings: PushSettings): Promise<void> {
  const { error } = await supabaseAdmin
    .from("settings")
    .upsert({ key: PUSH_SETTING, value: settings, is_public: false });
  if (error) throw error;
}

async function keepSecret(key: string, value: unknown): Promise<void> {
  const { error } =
    value === null
      ? await supabaseAdmin.from("secrets").delete().eq("key", key)
      : await supabaseAdmin.from("secrets").upsert({ key, value: value as never });
  if (error) throw error;
}

/** Keeps or, with `null`, removes the Expo access token. Only for an admin. */
export function saveExpoAccessToken(token: string | null): Promise<void> {
  return keepSecret(EXPO_ACCESS_TOKEN_SECRET, token);
}

/**
 * Keeps or, with `null`, removes the Firebase service account. The key file is checked first;
 * `false` means it is not one. Only for an admin.
 */
export async function saveServiceAccount(keyFile: unknown): Promise<boolean> {
  if (keyFile === null) {
    await keepSecret(FCM_SERVICE_ACCOUNT_SECRET, null);
    return true;
  }
  const account = serviceAccountSchema.safeParse(keyFile);
  if (!account.success) return false;
  await keepSecret(FCM_SERVICE_ACCOUNT_SECRET, account.data);
  return true;
}

/** Makes a new signing secret for the webhook, and returns it once. Only for an admin. */
export async function createWebhookSecret(): Promise<string> {
  const secret = `whsec_${randomBytes(32).toString("base64url")}`;
  await keepSecret(PUSH_WEBHOOK_SECRET, secret);
  return secret;
}

/** What a settings screen may know about the push secrets: whether they are there, never them. */
export interface PushSecretsSummary {
  expoAccessToken: boolean;
  /** The Firebase project and account the key file is for, which are not secret. */
  serviceAccount: { projectId: string; clientEmail: string } | null;
  webhookSecret: boolean;
}

export async function summarisePushSecrets(): Promise<PushSecretsSummary> {
  const [expo, account, webhook] = await Promise.all([
    stored("secrets", EXPO_ACCESS_TOKEN_SECRET),
    stored("secrets", FCM_SERVICE_ACCOUNT_SECRET),
    stored("secrets", PUSH_WEBHOOK_SECRET),
  ]);
  const parsed = serviceAccountSchema.safeParse(account);
  return {
    expoAccessToken: typeof expo === "string",
    serviceAccount: parsed.success
      ? { projectId: parsed.data.project_id, clientEmail: parsed.data.client_email }
      : null,
    webhookSecret: typeof webhook === "string",
  };
}

/** The ways this install sends pushes. A channel that is off, or not set up, is `null`. */
export interface PushChannels {
  expo: PushAdapter | null;
  fcm: PushAdapter | null;
  webhook: WebhookPush | null;
}

export async function getPushChannels(): Promise<PushChannels> {
  const settings = await getPushSettings();
  const [expoToken, account, webhookSecret] = await Promise.all([
    stored("secrets", EXPO_ACCESS_TOKEN_SECRET),
    stored("secrets", FCM_SERVICE_ACCOUNT_SECRET),
    stored("secrets", PUSH_WEBHOOK_SECRET),
  ]);
  const serviceAccount = serviceAccountSchema.safeParse(account);
  return {
    expo: settings.expo
      ? createExpoPush({ accessToken: typeof expoToken === "string" ? expoToken : undefined })
      : null,
    fcm:
      settings.fcm && serviceAccount.success
        ? createFcmPush({ serviceAccount: serviceAccount.data })
        : null,
    webhook:
      settings.webhook && typeof webhookSecret === "string"
        ? createWebhookPush({ url: settings.webhook.url, secret: webhookSecret })
        : null,
  };
}

/**
 * Sends a test event to a webhook address with the saved secret, for an admin checking their
 * backend receives it. Only for an admin.
 */
export async function sendTestWebhook(url: string): Promise<WebhookResult> {
  const secret = await stored("secrets", PUSH_WEBHOOK_SECRET);
  if (typeof secret !== "string") return { ok: false, detail: "Make a signing secret first." };
  return createWebhookPush({ url, secret }).send({
    type: "push.test",
    id: randomUUID(),
    conversationId: randomUUID(),
    contact: { id: randomUUID(), externalId: "test-user" },
    title: "Helpwren",
    preview: "This is a test from Settings > Mobile.",
    unreadCount: 1,
    sentAt: new Date().toISOString(),
  });
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
    .select("id, push_token, provider")
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

/** Hands messages to one channel, and records what it said. */
async function sendThrough(
  adapter: PushAdapter,
  devices: readonly { id: string; push_token: string }[],
  message: Omit<PushMessage, "to">,
  run: PushRun,
): Promise<boolean> {
  const tickets = await adapter.send(
    devices.map((device) => ({ ...message, to: device.push_token })),
  );

  const withReceipts = tickets.flatMap((ticket, index) =>
    ticket.ok && ticket.id !== null ? [{ id: ticket.id, device_id: devices[index]?.id ?? "" }] : [],
  );
  if (withReceipts.length > 0) {
    const inserted = await supabaseAdmin.from("push_tickets").insert(withReceipts);
    if (inserted.error) throw inserted.error;
  }
  const gone = tickets.flatMap((ticket, index) =>
    !ticket.ok && ticket.reason === "gone" ? [devices[index]?.id ?? ""] : [],
  );
  await forgetDevices(gone);
  run.removedDevices += gone.length;
  return tickets.some((ticket) => ticket.ok);
}

/**
 * Sends the pushes that are due: one notification per conversation, however many replies came
 * since the last run, and none for a reply that was read in the chat meanwhile. Each phone gets
 * it through its own service, Expo or Firebase, and the product's webhook, when there is one,
 * is told once per conversation. A scheduler calls this every minute through `/api/jobs/push`.
 */
export async function processPushQueue(given?: Partial<PushChannels>): Promise<PushRun> {
  const run: PushRun = { sent: 0, skipped: 0, failed: 0, removedDevices: 0 };
  const channels: PushChannels = given
    ? { expo: null, fcm: null, webhook: null, ...given }
    : await getPushChannels();

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

  if (!channels.expo && !channels.fcm && !channels.webhook) {
    // Push is off: what is owed is let go of, so the queue does not grow.
    await finish(
      jobs.map((job) => job.id),
      "skipped",
    );
    return run;
  }

  // Only Expo has receipts to ask for.
  if (channels.expo) run.removedDevices += await checkReceipts(channels.expo);

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
    const { contact } = conversation.data;

    // A phone is reached through its own service, when that channel is on.
    const devices = await devicesOf(contact);
    const reachable = {
      expo: channels.expo ? devices.filter((device) => device.provider === "expo") : [],
      fcm: channels.fcm ? devices.filter((device) => device.provider === "fcm") : [],
    };
    if (reachable.expo.length === 0 && reachable.fcm.length === 0 && !channels.webhook) {
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

    const badge = await badgeFor(contact.id);
    const notification = {
      title: settings.brand.name,
      body: preview(message?.body ?? null),
      data: { type: "support", conversationId },
      group: conversationId,
      badge,
    };

    let delivered = false;
    let unreachable = false;
    for (const [adapter, phones] of [
      [channels.expo, reachable.expo],
      [channels.fcm, reachable.fcm],
    ] as const) {
      if (!adapter || phones.length === 0) continue;
      try {
        delivered = (await sendThrough(adapter, phones, notification, run)) || delivered;
      } catch {
        unreachable = true;
      }
    }
    if (channels.webhook) {
      const event: PushEvent = {
        type: "push.reply",
        id: randomUUID(),
        conversationId,
        contact: { id: contact.id, externalId: contact.external_id },
        title: notification.title,
        preview: notification.body,
        unreadCount: badge,
        sentAt: new Date().toISOString(),
      };
      const result = await channels.webhook.send(event);
      if (result.ok) delivered = true;
      else unreachable = true;
    }

    // A service that could not be reached is tried again, unless another one delivered it.
    await finish(ids, delivered ? "sent" : unreachable ? "retry" : "failed");
  }
  return run;
}
