import { importPKCS8, SignJWT } from "jose";
import { z } from "zod";

import { type PushAdapter, type PushMessage, type PushTicket } from "./types";

const TOKEN_URI = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FCM_API = "https://fcm.googleapis.com/v1";
const TIMEOUT_MS = 10_000;
/** FCM's v1 API takes one message a request; this many go at once. */
const PARALLEL = 10;
/** An access token is fetched again this long before Google says it expires. */
const REFRESH_MARGIN_MS = 60_000;

/**
 * The key file Firebase gives for a service account: Project settings > Service accounts >
 * Generate new private key. Only the fields used here are checked.
 */
export const serviceAccountSchema = z.object({
  type: z.literal("service_account"),
  project_id: z.string().min(1),
  client_email: z.email(),
  private_key: z.string().includes("PRIVATE KEY"),
  token_uri: z.url().optional(),
});

export type ServiceAccount = z.infer<typeof serviceAccountSchema>;

export interface FcmPushOptions {
  serviceAccount: ServiceAccount;
  /** Replaces Firebase's address, for tests. */
  apiUrl?: string;
  /** Replaces `fetch`, for tests. */
  fetch?: typeof globalThis.fetch;
}

/** A registration token from a Firebase SDK: long, and made of URL-safe characters. */
export function isFcmToken(token: string): boolean {
  return /^[\w:.-]{20,4096}$/.test(token);
}

const errorSchema = z.object({
  error: z.object({
    code: z.number().optional(),
    status: z.string().optional(),
    message: z.string().default(""),
    details: z.array(z.object({ errorCode: z.string().optional() }).loose()).default([]),
  }),
});

/** What FCM is sent for one message: one notification, grouped per conversation everywhere. */
function toFcm(message: PushMessage) {
  return {
    message: {
      token: message.to,
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: {
        priority: "high",
        // A device that was offline gets only the latest of these when it comes back.
        collapse_key: message.group,
        notification: {
          tag: message.group,
          ...(message.badge === undefined ? {} : { notification_count: message.badge }),
        },
      },
      apns: {
        // iOS replaces a shown notification with the same id.
        headers: { "apns-collapse-id": message.group.slice(0, 64) },
        payload: {
          aps: {
            sound: "default",
            ...(message.badge === undefined ? {} : { badge: message.badge }),
          },
        },
      },
    },
  };
}

/**
 * Pushes through Firebase Cloud Messaging's HTTP v1 API, for native Android and iOS apps,
 * Flutter, and React Native with `@react-native-firebase/messaging`. One service account covers
 * both platforms: Firebase hands iOS pushes to Apple itself. The adapter signs its own Google
 * access token from the account's key and keeps it until shortly before it expires.
 */
export function createFcmPush(options: FcmPushOptions): PushAdapter {
  const send = options.fetch ?? globalThis.fetch.bind(globalThis);
  const account = options.serviceAccount;
  const apiUrl = options.apiUrl ?? FCM_API;
  let cached: { token: string; expiresAt: number } | undefined;

  async function accessToken(): Promise<string> {
    if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cached.token;

    const tokenUri = account.token_uri ?? TOKEN_URI;
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(account.client_email)
      .setAudience(tokenUri)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(await importPKCS8(account.private_key, "RS256"));

    const response = await send(tokenUri, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = z
      .object({ access_token: z.string(), expires_in: z.number().default(3600) })
      .safeParse(await response.json().catch(() => null));
    if (!response.ok || !body.success) {
      throw new Error(`Google refused the service account (status ${String(response.status)}).`);
    }
    cached = { token: body.data.access_token, expiresAt: Date.now() + body.data.expires_in * 1000 };
    return cached.token;
  }

  async function sendOne(message: PushMessage, token: string): Promise<PushTicket> {
    const response = await send(`${apiUrl}/projects/${account.project_id}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(toFcm(message)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) return { ok: true, id: null };

    const parsed = errorSchema.safeParse(await response.json().catch(() => null));
    const error = parsed.success ? parsed.data.error : undefined;
    const code =
      error?.details.find((detail) => detail.errorCode)?.errorCode ?? error?.status ?? "";
    // The credentials are wrong, not this device: the whole run is tried again later.
    if (response.status === 401 || code === "UNAUTHENTICATED") {
      throw new Error(`Firebase refused the access token: ${error?.message ?? ""}`);
    }
    // The message is the same for every device and FCM checks it, so an invalid argument
    // here is the token: Firebase's own advice is to forget the device in both cases.
    const gone = code === "UNREGISTERED" || code === "INVALID_ARGUMENT";
    return {
      ok: false,
      reason: gone ? "gone" : "failed",
      detail: `${code || String(response.status)}: ${error?.message ?? ""}`,
    };
  }

  return {
    name: "Firebase",

    async send(messages) {
      const token = await accessToken();
      const tickets: PushTicket[] = [];
      for (let start = 0; start < messages.length; start += PARALLEL) {
        const batch = messages.slice(start, start + PARALLEL);
        tickets.push(...(await Promise.all(batch.map((message) => sendOne(message, token)))));
      }
      return tickets;
    },

    // FCM has no receipts: what it accepted, it delivers or reports on the next send.
    receipts: () => Promise.resolve(new Map()),
  };
}
